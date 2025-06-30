# backend/app/models/product_full_name_field.py

from pydantic import BaseModel

class ProductFullNameField(BaseModel):
    ID: int | None = None
    SqlName: str
    DisplayName: str
    DisplayOrder: int
    IsIncluded: bool
