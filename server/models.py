from pydantic import BaseModel
from typing import Optional


class MeasurementParam(BaseModel):
    name: str
    value: float
    unit: str | None = None


class GenerateRequest(BaseModel):
    measurementId: str
    temperature: float = 25.0
    ph: float = 7.0
    params: list[MeasurementParam] = []


class FilterStatus(BaseModel):
    filterId: str
    status: str
    updatedAt: Optional[str] = None


class AtomPosition(BaseModel):
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
    atomPositions: list[AtomPosition]


class FilterDetails(BaseModel):
    filterId: str
    measurementId: str
    status: str
    createdAt: str
    updatedAt: str
    filterInfo: Optional[FilterInfo] = None
    errorMessage: Optional[str] = None
