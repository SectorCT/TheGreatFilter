import csv
import hashlib
import json
from collections import defaultdict
from pathlib import Path

from django.utils import timezone

from measurements.models import MeasurementImportRun, WaterMeasurement


def read_text_with_fallback(path):
    for encoding in ("utf-8-sig", "latin-1"):
        try:
            return Path(path).read_text(encoding=encoding)
        except UnicodeDecodeError:
            continue
    return Path(path).read_text(encoding="utf-8-sig", errors="replace")


def normalize_decimal(value):
    if value in (None, ""):
        return None
    value = str(value).strip()
    if not value:
        return None
    value = value.replace(",", ".")
    try:
        return float(value)
    except ValueError:
        return None


def normalize_text(value):
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def build_source_key(station_id, sample_date, sample_time, depth):
    return "|".join(
        [
            station_id or "",
            sample_date or "",
            sample_time or "",
            str(depth) if depth is not None else "",
        ]
    )


def load_station_metadata(dataset_dir):
    station_file = Path(dataset_dir) / "GEMStat_station_metadata.csv"
    stations = {}
    reader = csv.DictReader(read_text_with_fallback(station_file).splitlines())
    for row in reader:
        station_id = row.get("GEMS Station Number")
        if not station_id:
            continue
        latitude = normalize_decimal(row.get("Latitude"))
        longitude = normalize_decimal(row.get("Longitude"))
        stations[station_id] = {
            "station_id": station_id,
            "local_station_number": normalize_text(row.get("Local Station Number")),
            "country": normalize_text(row.get("Country Name")),
            "water_type": normalize_text(row.get("Water Type")),
            "station_identifier": normalize_text(row.get("Station Identifier")),
            "station_narrative": normalize_text(row.get("Station Narrative")),
            "water_body_name": normalize_text(row.get("Water Body Name")),
            "main_basin": normalize_text(row.get("Main Basin")),
            "latitude": latitude,
            "longitude": longitude,
        }
    return stations


def load_parameter_metadata(dataset_dir):
    parameter_file = Path(dataset_dir) / "GEMStat_parameter_metadata.csv"
    metadata = {}
    reader = csv.DictReader(read_text_with_fallback(parameter_file).splitlines())
    for row in reader:
        code = row.get("Parameter Code")
        if not code:
            continue
        metadata[code] = {
            "parameter_name": normalize_text(row.get("Parameter Name")),
            "parameter_long_name": normalize_text(row.get("Parameter Long Name")),
            "parameter_group": normalize_text(row.get("Parameter Group")),
        }
    return metadata


def parse_uploaded_measurement_csv(file_obj):
    text = file_obj.read().decode("utf-8-sig")
    reader = csv.DictReader(text.splitlines())

    temperature = None
    ph = None
    parameters = []

    for row in reader:
        code = normalize_text(row.get("parameterCode") or row.get("Parameter Code"))
        name = normalize_text(row.get("parameterName") or row.get("Parameter Name"))
        unit = normalize_text(row.get("unit") or row.get("Unit"))
        value = normalize_decimal(row.get("value") or row.get("Value"))

        row_temperature = normalize_decimal(row.get("temperature") or row.get("Temperature"))
        row_ph = normalize_decimal(row.get("ph") or row.get("pH") or row.get("PH"))

        if row_temperature is not None and temperature is None:
            temperature = row_temperature
        if row_ph is not None and ph is None:
            ph = row_ph

        if code and value is not None:
            if code.upper() == "TEMP" and temperature is None:
                temperature = value
                continue
            if code.lower() == "ph" and ph is None:
                ph = value
                continue
            parameters.append(
                {
                    "parameterCode": code,
                    "parameterName": name,
                    "unit": unit,
                    "value": value,
                    "file": None,
                }
            )

    return {
        "temperature": temperature,
        "ph": ph,
        "parameters": parameters,
    }


def sync_gemstat_measurements(dataset_dir, import_run=None, included_filenames=None, max_snapshots=None):
    dataset_path = Path(dataset_dir)
    if import_run is None:
        import_run = MeasurementImportRun.objects.create(
            source_name="gemstat",
            dataset_path=str(dataset_path),
        )

    stations = load_station_metadata(dataset_path)
    parameter_metadata = load_parameter_metadata(dataset_path)

    snapshots = defaultdict(
        lambda: {
            "external_station_id": "",
            "sample_date": None,
            "sample_time": None,
            "depth": None,
            "sample_location": {},
            "temperature": None,
            "ph": None,
            "parameters_data": {},
            "raw_rows": [],
        }
    )

    files_seen = 0
    included_filenames = set(included_filenames or [])
    for file_path in dataset_path.glob("*.csv"):
        if file_path.name.startswith("GEMStat_"):
            continue
        if included_filenames and file_path.name not in included_filenames:
            continue
        files_seen += 1
        reader = csv.DictReader(read_text_with_fallback(file_path).splitlines())
        for row in reader:
            station_id = row.get("GEMS Station Number")
            if not station_id:
                continue

            sample_date = row.get("Sample Date") or row.get("Sample.Date")
            sample_time = row.get("Sample Time") or row.get("Sample.Time")
            depth = normalize_decimal(row.get("Depth"))
            parameter_code = row.get("Parameter Code") or row.get("Parameter.Code")
            source_key = build_source_key(station_id, sample_date, sample_time, depth)
            if max_snapshots and source_key not in snapshots and len(snapshots) >= max_snapshots:
                continue

            snapshot = snapshots[source_key]
            snapshot["external_station_id"] = station_id
            snapshot["sample_date"] = sample_date
            snapshot["sample_time"] = sample_time
            snapshot["depth"] = depth
            snapshot["sample_location"] = stations.get(station_id, {"station_id": station_id})

            parameter_info = parameter_metadata.get(parameter_code, {})
            value = normalize_decimal(row.get("Value"))
            parameter_payload = {
                "file": file_path.name,
                "parameterCode": parameter_code,
                "parameterName": parameter_info.get("parameter_name"),
                "unit": normalize_text(row.get("Unit")),
                "value": value,
                "valueFlags": normalize_text(row.get("Value Flags") or row.get("Value.Flags")),
                "dataQuality": normalize_text(row.get("Data Quality") or row.get("Data.Quality")),
                "analysisMethodCode": normalize_text(
                    row.get("Analysis Method Code") or row.get("Analysis.Method.Code")
                ),
            }

            if parameter_code and value is not None:
                snapshot["parameters_data"][parameter_code] = parameter_payload
                if parameter_code.upper() == "TEMP":
                    snapshot["temperature"] = value
                elif parameter_code.lower() == "ph":
                    snapshot["ph"] = value

            snapshot["raw_rows"].append(
                {
                    "file": file_path.name,
                    "row": row,
                }
            )

    created = 0
    updated = 0
    skipped = 0

    for source_key, snapshot in snapshots.items():
        location = snapshot["sample_location"]
        hash_payload = {
            "temperature": snapshot["temperature"],
            "ph": snapshot["ph"],
            "parameters_data": snapshot["parameters_data"],
            "sample_location": location,
        }
        import_hash = hashlib.sha256(
            json.dumps(hash_payload, sort_keys=True, default=str).encode("utf-8")
        ).hexdigest()

        defaults = {
            "owner": None,
            "name": (
                f"{location.get('station_identifier') or snapshot['external_station_id']} "
                f"{snapshot['sample_date']} {snapshot['sample_time'] or ''}"
            ).strip(),
            "source": WaterMeasurement.SOURCE_GEMSTAT,
            "temperature": snapshot["temperature"],
            "ph": snapshot["ph"],
            "parameters_data": snapshot["parameters_data"],
            "sample_location": location,
            "raw_import_data": {"rows": snapshot["raw_rows"][:25], "row_count": len(snapshot["raw_rows"])},
            "source_dataset": "gemstat",
            "external_station_id": snapshot["external_station_id"],
            "sample_date": snapshot["sample_date"],
            "sample_time": snapshot["sample_time"] or None,
            "depth": snapshot["depth"],
            "import_hash": import_hash,
            "is_public": True,
        }

        measurement, was_created = WaterMeasurement.objects.get_or_create(
            source_key=source_key,
            defaults=defaults,
        )
        if was_created:
            created += 1
            continue

        if measurement.import_hash == import_hash:
            skipped += 1
            continue

        for field, value in defaults.items():
            setattr(measurement, field, value)
        measurement.save()
        updated += 1

    import_run.files_seen = files_seen
    import_run.measurements_created = created
    import_run.measurements_updated = updated
    import_run.measurements_skipped = skipped
    import_run.status = MeasurementImportRun.STATUS_SUCCESS
    import_run.finished_at = timezone.now()
    import_run.save()
    return import_run
