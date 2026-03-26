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


def normalize_date(value):
    return normalize_text(value)


def normalize_time(value):
    return normalize_text(value)


def build_source_key(station_id, sample_date, sample_time, depth):
    return "|".join(
        [
            station_id or "",
            sample_date or "",
            sample_time or "",
            str(depth) if depth is not None else "",
        ]
    )


def build_station_source_key(station_id):
    return f"station::{station_id or ''}"


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


def extract_volume(row):
    value = normalize_decimal(
        row.get("Volume")
        or row.get("Sample Volume")
        or row.get("Sample.Volume")
        or row.get("Water Volume")
        or row.get("Water.Volume")
    )
    unit = normalize_text(
        row.get("Volume Unit")
        or row.get("Volume.Unit")
        or row.get("Sample Volume Unit")
        or row.get("Sample.Volume.Unit")
    )
    if value is None and not unit:
        return None
    return {"value": value, "unit": unit or "L"}


def format_numeric(value):
    if value is None:
        return None
    return f"{value:g}"


def build_snapshot_summary(snapshot):
    summary_parts = []
    volume = snapshot.get("volume") or {}
    volume_value = volume.get("value")
    if volume_value is not None:
        volume_text = f"water {format_numeric(volume_value)}{volume.get('unit') or ''}".strip()
        summary_parts.append(volume_text)

    parameter_text = []
    for parameter in list((snapshot.get("parameters") or {}).values())[:3]:
        value = format_numeric(parameter.get("value"))
        if value is None:
            continue
        unit = parameter.get("unit") or ""
        parameter_text.append(f"{parameter.get('parameterCode') or parameter.get('parameterName')} {value}{unit}".strip())

    if parameter_text:
        summary_parts.append(", ".join(parameter_text))

    return " - ".join(summary_parts) if summary_parts else "Measurement snapshot"


def sort_date_keys(date_keys):
    return sorted(date_keys, reverse=True)


def sort_snapshots(snapshots):
    return sorted(
        snapshots,
        key=lambda item: (
            item.get("sampleTime") or "",
            item.get("depth") if item.get("depth") is not None else -1,
        ),
        reverse=True,
    )


def build_latest_snapshot_cache(date_key, snapshot_index, snapshot):
    return {
        "dateKey": date_key,
        "snapshotIndex": snapshot_index,
        "sampleTime": snapshot.get("sampleTime"),
        "depth": snapshot.get("depth"),
        "volume": snapshot.get("volume"),
        "temperature": snapshot.get("temperature"),
        "ph": snapshot.get("ph"),
        "parameters": snapshot.get("parameters", {}),
        "summary": snapshot.get("summary"),
        "parameterCount": len(snapshot.get("parameters") or {}),
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

    station_groups = defaultdict(
        lambda: {
            "external_station_id": "",
            "sample_location": {},
            "snapshots": {},
            "source_files": set(),
            "row_count": 0,
            "preview_rows": [],
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
            station_id = normalize_text(row.get("GEMS Station Number"))
            if not station_id:
                continue

            sample_date = normalize_date(row.get("Sample Date") or row.get("Sample.Date"))
            sample_time = normalize_time(row.get("Sample Time") or row.get("Sample.Time"))
            depth = normalize_decimal(row.get("Depth"))
            snapshot_key = build_source_key(station_id, sample_date, sample_time, depth)
            if max_snapshots and snapshot_key not in station_groups[station_id]["snapshots"]:
                current_snapshot_total = sum(len(group["snapshots"]) for group in station_groups.values())
                if current_snapshot_total >= max_snapshots:
                    continue

            station_group = station_groups[station_id]
            station_group["external_station_id"] = station_id
            station_group["sample_location"] = stations.get(station_id, {"station_id": station_id})
            station_group["source_files"].add(file_path.name)
            station_group["row_count"] += 1
            if len(station_group["preview_rows"]) < 25:
                station_group["preview_rows"].append({"file": file_path.name, "row": row})

            snapshot = station_group["snapshots"].setdefault(
                snapshot_key,
                {
                    "dateKey": sample_date or "unknown",
                    "sampleTime": sample_time,
                    "depth": depth,
                    "volume": extract_volume(row),
                    "temperature": None,
                    "ph": None,
                    "parameters": {},
                    "rawRowCount": 0,
                },
            )

            snapshot["rawRowCount"] += 1
            if snapshot.get("volume") is None:
                snapshot["volume"] = extract_volume(row)

            parameter_code = normalize_text(row.get("Parameter Code") or row.get("Parameter.Code"))
            parameter_info = parameter_metadata.get(parameter_code, {})
            value = normalize_decimal(row.get("Value"))
            parameter_payload = {
                "file": file_path.name,
                "parameterCode": parameter_code,
                "parameterName": parameter_info.get("parameter_name"),
                "parameterLongName": parameter_info.get("parameter_long_name"),
                "parameterGroup": parameter_info.get("parameter_group"),
                "unit": normalize_text(row.get("Unit")),
                "value": value,
                "valueFlags": normalize_text(row.get("Value Flags") or row.get("Value.Flags")),
                "dataQuality": normalize_text(row.get("Data Quality") or row.get("Data.Quality")),
                "analysisMethodCode": normalize_text(
                    row.get("Analysis Method Code") or row.get("Analysis.Method.Code")
                ),
            }

            if parameter_code and value is not None:
                snapshot["parameters"][parameter_code] = parameter_payload
                if parameter_code.upper() == "TEMP":
                    snapshot["temperature"] = value
                elif parameter_code.lower() == "ph":
                    snapshot["ph"] = value

    created = 0
    updated = 0
    skipped = 0

    for station_id, station_group in station_groups.items():
        measurements_by_date = {}
        for snapshot in station_group["snapshots"].values():
            snapshot["summary"] = build_snapshot_summary(snapshot)
            date_key = snapshot.get("dateKey") or "unknown"
            measurements_by_date.setdefault(date_key, []).append(snapshot)

        for date_key, snapshots in list(measurements_by_date.items()):
            measurements_by_date[date_key] = sort_snapshots(snapshots)

        latest_snapshot = {}
        latest_date = None
        latest_snapshot_record = None
        for date_key in sort_date_keys(measurements_by_date.keys()):
            date_snapshots = measurements_by_date[date_key]
            if not date_snapshots:
                continue
            latest_date = date_key
            latest_snapshot_record = date_snapshots[0]
            latest_snapshot = build_latest_snapshot_cache(date_key, 0, latest_snapshot_record)
            break

        snapshot_count = sum(len(snapshots) for snapshots in measurements_by_date.values())
        location = station_group["sample_location"]
        hash_payload = {
            "measurements_by_date": measurements_by_date,
            "sample_location": location,
        }
        import_hash = hashlib.sha256(
            json.dumps(hash_payload, sort_keys=True, default=str).encode("utf-8")
        ).hexdigest()

        defaults = {
            "owner": None,
            "name": location.get("station_identifier") or station_id,
            "source": WaterMeasurement.SOURCE_GEMSTAT,
            "temperature": (latest_snapshot_record or {}).get("temperature"),
            "ph": (latest_snapshot_record or {}).get("ph"),
            "parameters_data": (latest_snapshot_record or {}).get("parameters", {}),
            "measurements_by_date": measurements_by_date,
            "latest_snapshot": latest_snapshot,
            "date_count": len(measurements_by_date),
            "snapshot_count": snapshot_count,
            "sample_location": location,
            "raw_import_data": {
                "rows": station_group["preview_rows"],
                "row_count": station_group["row_count"],
                "source_files": sorted(station_group["source_files"]),
            },
            "source_dataset": "gemstat",
            "external_station_id": station_group["external_station_id"],
            "sample_date": latest_date,
            "sample_time": (latest_snapshot_record or {}).get("sampleTime") or None,
            "depth": (latest_snapshot_record or {}).get("depth"),
            "source_key": build_station_source_key(station_group["external_station_id"]),
            "import_hash": import_hash,
            "is_public": True,
        }

        measurement, was_created = WaterMeasurement.objects.get_or_create(
            source_key=defaults["source_key"],
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
