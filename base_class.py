
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Mapped, mapped_column
from typing import Optional, List, Dict, Any
from sqlalchemy import String, JSON
from sqlalchemy.orm import declarative_base 

class UserInfo(BaseModel): 
    username: str
    email: EmailStr = None 
    password: str
    group: str
    policy_topic: str
    state: str
    age: int = None 
    

class UserResponse(BaseModel): 
    input_text: str

class EndOfCallFeedback(BaseModel): 
    identifier: str
    username: str 
    full_transcript: str 
    trainer_agent_feedback: str
    
class DelibsInfo(BaseModel): 
    username: str 
    organization: str
    state: str
    policy_topic: str
    ideology: str
    lawmaker_name: str
      
    @field_validator('ideology')
    @classmethod
    def _validate_ideology(cls, v): 
        valid = ["very conservative", "conservative", "liberal", "very liberal", "independent"]
        if v not in valid: 
            raise ValueError(f"Ideology must be one of {valid}")
        return v
    
class DelibsResponse(BaseModel): 
    lawmaker_response: str
    coach_response: Optional[str] = None
    discussion_history: Optional[List[Dict[str, Any]]] = None

Base = declarative_base()
class DeliberationORM(Base):
    __tablename__ = "deliberations"
    
    username: Mapped[str] = mapped_column(String)
    unique_id: Mapped[str] = mapped_column(String, primary_key=True)
    organization: Mapped[str] = mapped_column(String)
    state: Mapped[str] = mapped_column(String)
    policy_topic: Mapped[str] = mapped_column(String)
    ideology: Mapped[str] = mapped_column(String)
    lawmaker_name: Mapped[str] = mapped_column(String)
    discussion_history: Mapped[list] = mapped_column(JSON) 
