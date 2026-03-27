from pydantic import BaseModel, Field
from typing import Any, Optional


class MeasurementParam(BaseModel):
    name: str
    value: float
    unit: str | None = None


class GenerateRequest(BaseModel):
    measurementId: str
    temperature: float = Field(default=25.0, ge=-5.0, le=100.0)
    ph: float = Field(default=7.0, ge=0.0, le=14.0)
    params: list[MeasurementParam] = []


class FilterStatus(BaseModel):
    filterId: str
    status: str
    updatedAt: Optional[str] = None


class AtomPosition(BaseModel):
    id: int
    x: float
    y: float
    z: float
    element: str


class FilterInfo(BaseModel):
    poreSize: float
    layerThickness: float
    latticeSpacing: float
    materialType: str
    bindingEnergy: float
    removalEfficiency: float
    pollutant: str
    pollutantSymbol: str
    method: str = "hf"
    atomPositions: list[AtomPosition]
    # Each connection: {"from": int, "to": int, "order": int}
    # "from" is a reserved keyword so stored as plain dicts, not a nested model.
    connections: list[dict[str, Any]] = []


class FilterDetails(BaseModel):
    filterId: str
    measurementId: str
    status: str
    createdAt: str
    updatedAt: str
    filterInfo: Optional[FilterInfo] = None
    errorMessage: Optional[str] = None
