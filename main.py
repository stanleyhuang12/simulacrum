from pydantic import BaseModel, EmailStr, field_validator, model_validator, ValidationError
from fastapi import FastAPI, HTTPException, Request
import simulacrum
from uuid import UUID
import importlib
from typing import Optional, List, Dict, Any
importlib.reload(simulacrum)
from simulacrum import SimAgent, Deliberation
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, Mapped, mapped_column, Session
from sqlalchemy import Integer, String, JSON, text
from contextlib import asynccontextmanager

import uuid
from starlette.middleware.sessions import SessionMiddleware
from fastapi.middleware.cors import CORSMiddleware

class UserInfo(BaseModel): 
    username: str
    email: EmailStr | None 
    password: str
    group: str
    policy_topic: str
    state: str
    age: int | None = None

# class SimAgentInfo(BaseModel): 
#     lawmaker_name: str
#     ideology: str
#     state: str
#     policy_topic: str 
#     agent_id: UUID | None = None
#     is_chair: bool = False
    
#     @field_validator('ideology')
#     @classmethod
#     def _validate_ideology(cls, v): 
#         valid = ["very conservative", "conservative", "liberal", "very liberal", "independent"]
#         if v not in valid: 
#             raise ValueError(f"Ideology must be one of {valid}")
#         return v
    
# class SimAgentResponse(BaseModel):
#     name: str
#     ideology: str
#     state: str  
#     policy_topic: str
#     is_chair: bool
#     persona: str
    
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

# class FeedbackORM(Base): 
#     __tablename__ = "feedbacks"
    


engine = create_engine("sqlite:///database/database.db")

Base.metadata.drop_all(engine)
Base.metadata.create_all(engine)
        
with engine.connect() as connection: 
    results = connection.execute(text("SELECT * FROM deliberations"))
    results.fetchall()
    
@asynccontextmanager
async def lifespan(app: FastAPI): 
    Base.metadata.create_all(engine)
    yield 
    
    
app = FastAPI(debug=True, docs_url="/swagger_docs", lifespan=lifespan)
# app.add_middleware(SessionMiddleware, secret_key='striped_ookh_policy_translation')
## For testing only

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


SESSION_COOKIE_NAME = "session-id-delibs"

@app.middleware("http")
async def manage_unique_session(request: Request, call_next): 
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_id: 
        session_id = str(uuid.uuid4())
        response = await call_next(request)
        response.set_cookie(SESSION_COOKIE_NAME, session_id, httponly=True, samesite="lax", max_age=1800)
        return response 
    else: 
        response = await call_next(request)
        response.set_cookie(SESSION_COOKIE_NAME, session_id, httponly=True, samesite="lax", max_age=1800)
        return response 
    

@app.get("/")
def read_root(request: Request): 
    return {"message": "Hello World!", "user": request.cookies.get(SESSION_COOKIE_NAME, {})}

# @app.post("/v1/post_user_info")
# def get_user_information(user: UserInfo): 
#     if user.password != 'stripedpolicytranslationtrial': 
#         raise HTTPException(status_code=400, detail="User must enter the correct password to try demo product.")
#     if user.age < 13: 
#         raise HTTPException(status_code=400, detail="User must be at least 13")
   
#     return {"message": "Welcome aboard to the Legislative Simulacrum! Your user profile has been created.", 
#             "username": user.username}

# @app.get("/save_session/{uuid}")
# async def set_session_unique_identifier(request: Request, uuid: UUID):
#     request.session['unique_identifier'] = uuid
#     return {"message": "Agent unique_identifier set."}

# @app.get("/retrieve_session/")
# async def get_session_unique_identifier(request: Request):
#     return request.session.get('unique_identifier', None)




@app.post("/trial-v1/delibs/create_deliberations_instance")
def initialize_deliberations_simulacrum(request: Request, delib_params: DelibsInfo): 
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_id:
        raise HTTPException(status_code=400, detail="Session cookie missing. User must enable cookies settings.")
    print("Step 1.")
    delib_inst = Deliberation(
        username=delib_params.username,
        group=delib_params.organization,
        state=delib_params.state,
        policy_topic=delib_params.policy_topic,
        ideology=delib_params.ideology,
        lawmaker_name=delib_params.lawmaker_name
    )
    print("Step 2.")
    with Session(engine) as session: 
        if session.query(DeliberationORM).filter_by(unique_id=session_id).first():
            print("DeliberationORM from last session detected.")
            pass
        new_delib_orm = DeliberationORM(
            username=delib_inst._username,
            unique_id=session_id, 
            organization=delib_inst._group,
            state=delib_inst.state,
            policy_topic=delib_inst.policy_topic,
            ideology=delib_inst.ideology,
            lawmaker_name=delib_inst.lawmaker_name,
            discussion_history=[]
        )
        session.add(new_delib_orm)
        session.commit()
    
    return {"message": "Deliberation structure initialized."}

def manage_deliberations(session_id):
    """
    After initializes Deliberations structure, we can retrieve the Deliberations ORM using SQLAlchemy. 
    Then, we take the DeliberationORM mapping and repopulate the Deliberations structure
    """
    
    with Session(engine) as session: 
        delib_orm = session.query(DeliberationORM).filter_by(unique_id=session_id).first()
        if not delib_orm: 
            raise HTTPException(status_code=404, detail="No deliberations structure found. Check if cookies are enabled and restart the application.")
        
        delibs = Deliberation(
            username=delib_orm.username,
            group=delib_orm.organization,
            state=delib_orm.state,
            policy_topic=delib_orm.policy_topic,
            ideology=delib_orm.ideology,
            lawmaker_name=delib_orm.lawmaker_name
        )

        delibs.discussion_history = delib_orm.discussion_history
    
        return delibs 


@app.post("/trial-v1/delibs/converse-with-deliberations", response_model=DelibsResponse)
def converse_with_deliberations(request: Request, input_text:UserResponse): 
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    delibs = manage_deliberations(session_id=session_id)
    
    response = delibs.panel_discussion(input_text)
    print(response)
    with Session(engine) as session: 
        delib_orm = session.query(DeliberationORM).filter_by(unique_id=session_id).first()
        if delib_orm: ## Should always be true
            delib_orm.discussion_history = delibs.discussion_history
            session.commit()
    
    return DelibsResponse(lawmaker_response=response[0], 
                          coach_response=response[1], 
                          discussion_history=delibs.discussion_history)


def debug_database():
    with Session(engine) as session:
        # Check what tables exist
        tables = session.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
        print(f"All tables in database: {[table[0] for table in tables]}")
        
        # Check the schema of the deliberations table
        schema = session.execute(text("PRAGMA table_info(deliberations)")).fetchall()
        print(f"deliberations table schema: {schema}")
        
        # Check raw data
        raw_data = session.execute(text("SELECT * FROM deliberations")).fetchall()
        print(f"Raw data from deliberations table: {raw_data}")
        
        # Try ORM query
        orm_data = session.query(DeliberationORM).all()
        print(f"ORM query result: {orm_data}")

# Call this function to debug
debug_database()



    

@app.get("/trial-v1/delibs/retrieve-end-of-call-transcript-and-feedback")
def end_of_call_management(request: Request) -> EndOfCallFeedback: 
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    
    delibs = manage_deliberations(session_id=session_id)
    full_transcript = delibs._retrieve_memory(memory_type='long_term')
    feedback = delibs.trainer_end_of_session()
    
    return EndOfCallFeedback(identifier=session_id,
                             username=delibs._username,
                             full_transcript=full_transcript,
                             trainer_agent_feedback=feedback)
    


# def manage_deliberations(session_id, delib_params: Optional[DelibsInfo] = None): 
#     """
#     TODO: Ensure that the injected history will be deserialized. 
#     TODO: Write a Simulacrum function that accepts injected history and dynamic start-up.
#     """   
#     with Session(engine) as session: 
#         delib_orm = session.query(DeliberationORM).filter_by(unique_id=session_id).first() # query not execute because we want ORM mapped instance 
        
#         if delib_orm: 
#             print("No past delib orm saved")
#             delibs = Deliberation(
#                 username=delib_orm.username,
#                 group=delib_orm.organization,
#                 state=delib_orm.state,
#                 policy_topic=delib_orm.policy_topic,
#                 ideology=delib_orm.ideology, 
#                 lawmaker_name=delib_orm.lawmaker_name
#             ) 
#             return delibs 
#         elif not delib_orm and delib_params: 
#             delib_inst = initialize_deliberations_simulacrum(delib_params)
#             new_delib_orm = DeliberationORM(
#                 unique_id=session_id, 
#                 organization=delib_inst.group,
#                 state=delib_inst.state,
#                 policy_topic=delib_inst.policy_topic,
#                 ideology=delib_inst.ideology,
#                 lawmaker_name=delib_inst.lawmaker_name,
#                 discussion_history=delib_inst.discussion_history
#             )
            
             
#             session.add(new_delib_orm)
  
#             session.commit()
            
#             return delib_inst
   
# @app.post("/trial-v1/converse-deliberations/", response_model=DelibsResponse)                 
# def converse_deliberations(request: Request, input_text: str, delib_params: Optional[dict]):
#     """
#     Procedure
    
#     .1  If no instance of Deliberations ORM in SQLite DB:
#             Initalize, update SQLite DB, return Deliberation instance  
#         else: 
#             Retrieve and return Deliberations instance
        
#     .2  User engages with the virtual lawmaker (activites housed in the Deliberations instance)
#     .3  Update the SQLite DB with latest conversation history 
#     .4  Return the content responses. 
#     """
#     persistent_session_id = request.cookies.get(SESSION_COOKIE_NAME)
    
#     delibs_obj = manage_deliberations(
#         session_id=persistent_session_id
#         )
    
#     if not isinstance(delibs_obj, Deliberation): 
#         raise TypeError("Internal type error.")
    
#     results = delibs_obj.panel_discussion(input_text)
    
#     with Session(engine) as session: 
#         delib_orm = session.query(DeliberationORM).filter_by(unique_id=persistent_session_id).first()
#         if delib_orm: ## Should always be true
#             delib_orm.discussion_history = delibs_obj.discussion_history
#             session.commit()
#             print("Saved:", delib_orm.discussion_history)  # Add this line

#     return DelibsResponse(
#         lawmaker_response=results[0],
#         coach_response=results[1],
#         discussion_history=delibs_obj.discussion_history
#     )










