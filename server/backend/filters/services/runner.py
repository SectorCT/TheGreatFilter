import time

import requests
from django.conf import settings

# Seconds between core status polls
_POLL_INTERVAL = 3
# Total seconds before giving up — should be < Celery soft time limit (1500s)
_POLL_TIMEOUT = 1440


def _core_url() -> str:
    return getattr(settings, "CORE_SERVICE_URL", "http://core:8000").rstrip("/")


def _build_params(measurement, target_codes: list[str] | None = None) -> list[dict]:
    """Convert WaterMeasurement.pollutants_data → core MeasurementParam list.

    When *target_codes* is non-empty, only parameters whose code (dict key
    or parameterCode value) appears in that list are included — so the core
    only sees the pollutants the user actually selected.
    """
    target_set = {c.upper() for c in target_codes} if target_codes else None
    params = []
    for code, data in (measurement.pollutants_data or {}).items():
        if target_set:
            param_code = (data.get("parameterCode") or code).upper()
            if param_code not in target_set and code.upper() not in target_set:
                continue
        try:
            params.append(
                {
                    "name": data.get("parameterCode") or code,
                    "value": float(data["value"]),
                    "unit": data.get("unit"),
                }
            )
        except (KeyError, TypeError, ValueError):
            continue
    return params


def run_filter_generation(generated_filter) -> dict:
    """
    Call the core simulation service to generate a filter, wait for completion,
    and return a result dict that the Celery task stores on GeneratedFilter.

    Raises RuntimeError / TimeoutError on failure so the Celery task can
    mark the filter as Failed and record the error message.
    """
    measurement = generated_filter.measurement
    base = _core_url()
    experiment = generated_filter.experiment_payload or {}
    use_quantum_computer = bool(experiment.get("useQuantumComputer", False))
    target_codes = experiment.get("targetParameterCodes", [])

    # ── 1. Submit generation request ──────────────────────────────────────
    payload = {
        "measurementId": str(generated_filter.measurement_id),
        "temperature": measurement.temperature if measurement.temperature is not None else 25.0,
        "ph": measurement.ph if measurement.ph is not None else 7.0,
        "params": _build_params(measurement, target_codes),
        "useQuantumComputer": use_quantum_computer,
    }

    try:
        submit_resp = requests.post(
            f"{base}/filters/generate",
            json=payload,
            timeout=30,
        )
        submit_resp.raise_for_status()
    except requests.RequestException as exc:
        raise RuntimeError(f"Core service unreachable: {exc}") from exc

    core_filter_id = submit_resp.json()["filterId"]

    # ── 2. Poll until terminal state ───────────────────────────────────────
    deadline = time.monotonic() + _POLL_TIMEOUT
    core_status = None

    while time.monotonic() < deadline:
        try:
            status_resp = requests.get(
                f"{base}/filters/{core_filter_id}/status",
                timeout=10,
            )
            status_resp.raise_for_status()
        except requests.RequestException as exc:
            # Transient network error — keep polling until deadline
            time.sleep(_POLL_INTERVAL)
            continue

        core_status = status_resp.json().get("status")

        if core_status == "Success":
            break
        if core_status == "Failed":
            raise RuntimeError(
                f"Core reported Failed for core filter {core_filter_id}"
            )

        time.sleep(_POLL_INTERVAL)
    else:
        raise TimeoutError(
            f"Core filter generation timed out after {_POLL_TIMEOUT}s "
            f"(core filter id: {core_filter_id})"
        )

    # ── 3. Fetch full result ───────────────────────────────────────────────
    try:
        result_resp = requests.get(
            f"{base}/filters/{core_filter_id}",
            timeout=15,
        )
        result_resp.raise_for_status()
    except requests.RequestException as exc:
        raise RuntimeError(f"Failed to fetch core result: {exc}") from exc

    result = result_resp.json()
    info = result.get("filterInfo") or {}
    used_quantum_computer = bool(info.get("usedQuantumComputer", False))
    layers = info.get("layers", [])

    # ── 4. Map to GeneratedFilter payload fields ───────────────────────────

    # Per-layer summary (omit heavy atomPositions/connections for DB storage)
    layer_summaries = [
        {
            "pollutant": l.get("pollutant"),
            "pollutantSymbol": l.get("pollutantSymbol"),
            "poreSize": l.get("poreSize"),
            "layerThickness": l.get("layerThickness"),
            "materialType": l.get("materialType"),
            "bindingEnergy": l.get("bindingEnergy"),
            "removalEfficiency": l.get("removalEfficiency"),
            "method": l.get("method"),
        }
        for l in layers
    ]

    return {
        "used_quantum_computer": used_quantum_computer,
        "filter_structure": {
            "poreSize": info.get("poreSize"),
            "layerThickness": info.get("layerThickness"),
            "latticeSpacing": info.get("latticeSpacing"),
            "materialType": info.get("materialType"),
            "atomPositions": info.get("atomPositions", []),
            "connections": info.get("connections", []),
            "layers": [
                {
                    "pollutantSymbol": l.get("pollutantSymbol"),
                    "materialType": l.get("materialType"),
                    "atomPositions": l.get("atomPositions", []),
                    "connections": l.get("connections", []),
                }
                for l in layers
            ],
        },
        "experiment_payload": {
            "measurement_id": str(generated_filter.measurement_id),
            "study_id": str(generated_filter.study_id),
            "core_filter_id": core_filter_id,
            "useQuantumComputer": use_quantum_computer,
            "temperature": measurement.temperature,
            "ph": measurement.ph,
            "params": _build_params(measurement, target_codes),
            "targetParameterCodes": target_codes,
        },
        "result_payload": {
            "bindingEnergy": info.get("bindingEnergy"),
            "removalEfficiency": info.get("removalEfficiency"),
            "pollutant": info.get("pollutant"),
            "pollutantSymbol": info.get("pollutantSymbol"),
            "core_filter_id": core_filter_id,
            "usedQuantumComputer": used_quantum_computer,
            "method": info.get("method"),
            "layers": layer_summaries,
        },
        "summary_metrics": {
            "parameter_count": measurement.parameter_count,
            "layer_count": len(layers),
            "removalEfficiency": info.get("removalEfficiency"),
            "bindingEnergy": info.get("bindingEnergy"),
            "materialType": info.get("materialType"),
            "usedQuantumComputer": used_quantum_computer,
        },
        "export_payload": {
            "format": "csv",
            "core_filter_id": core_filter_id,
            "rows": [
                {"key": k, "value": str(v)}
                for k, v in {
                    "useQuantumComputer": use_quantum_computer,
                    "layerCount": len(layers),
                    "poreSize": info.get("poreSize"),
                    "layerThickness": info.get("layerThickness"),
                    "materialType": info.get("materialType"),
                    "bindingEnergy": info.get("bindingEnergy"),
                    "removalEfficiency": info.get("removalEfficiency"),
                    "pollutant": info.get("pollutant"),
                    "pollutantSymbol": info.get("pollutantSymbol"),
                }.items()
                if v is not None
            ],
        },
    }
