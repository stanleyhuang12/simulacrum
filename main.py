import uuid

from fastapi import FastAPI, HTTPException, Request, Response, WebSocket
from fastapi.middleware.cors import CORSMiddleware

# Simulacrum classes 
from simulacrum import Deliberation

# ORM management and typing 
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, Session
from sqlalchemy import text, select, exists
from contextlib import asynccontextmanager
from base_class import * 

from mangum import Mangum


# engine = create_engine("sqlite:///database/database.db")

engine = create_engine("postgresql+psycopg2://deliberations:simulacrum32()@deliberations-legislative-simulacrum.cjqmko8aimkn.us-east-2.rds.amazonaws.com/deliberations", 
                       pool_pre_ping=True)

Base = declarative_base()
@asynccontextmanager
async def lifespan(app: FastAPI): 

    Base.metadata.create_all(engine)
    yield 
    
    
app = FastAPI(debug=True, docs_url="/swagger_docs", lifespan=lifespan)
## For testing only
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://legislative-simulacrum.vercel.app", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SESSION_COOKIE_NAME = "session-id-delibs"
# load_dotenv(find_dotenv())
# os.getenv('OPENAI_API_KEY')


@app.middleware("http")
async def manage_unique_session(request: Request, call_next): 
    print("Running middleware process")
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    if not session_id: 
        print(f"Session id {session_id}")
        session_id = str(uuid.uuid4())
        response = await call_next(request)
        response.set_cookie(SESSION_COOKIE_NAME, session_id, httponly=True, samesite="lax", max_age=1800, secure=False)
        return response 
    else: 
        response = await call_next(request)
        response.set_cookie(SESSION_COOKIE_NAME, session_id, httponly=True, samesite="lax", max_age=1800, secure=False)
        return response 
    
@app.get("/")
def read_root(request: Request, response: Response): 
    print("root API request ")
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    
    if not session_id:
        # No cookie, generate new one
        session_id = str(uuid.uuid4())
        response.set_cookie(key=SESSION_COOKIE_NAME, value=session_id)

    return {"message": "Hello World!", "user": session_id}
   

@app.websocket("/transcribe-audio")
async def websocket_handler(websocket: WebSocket): 
    print("Await websocket request")
    user_cookie = websocket.cookies.get(SESSION_COOKIE_NAME)
    await websocket.accept()
    try:
        print("Running websocket connections")
        while True: 
            data = await websocket.receive_text()
            delibs_response  = converse_with_deliberations_internal(session_id=user_cookie, input_text=data)
            await websocket.send_text(delibs_response) ## TODO: THIS IS A TUPLE OD LAWMAKER AND MOIVATION

    except Exception as e:
        print("Connection closed with error:", e)

@app.post("/trial-v1/delibs/create_deliberations_instance")
def initialize_deliberations_simulacrum(request: Request, delib_params: DelibsInfo):
    print("Creating initiation deliberations") 
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


def converse_with_deliberations_internal(session_id, input_text:UserResponse): 
    
    delibs = manage_deliberations(session_id=session_id)
    lawmaker_response, coach_response = delibs.panel_discussion(input_text)
    
    with Session(engine) as session: 
        delib_orm = session.query(DeliberationORM).filter_by(unique_id=session_id).first()
        if delib_orm: 
            delib_orm.discussion_history = delibs.discussion_history
            session.commit()
         
    return lawmaker_response


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
        # List all tables
        tables = session.execute(
            text("SELECT table_name FROM information_schema.tables WHERE table_schema='public';")
        ).fetchall()
        print(f"All tables in database: {[table[0] for table in tables]}")

        # Check schema of 'deliberations' table
        schema = session.execute(
            text("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'deliberations';
            """)
        ).fetchall()
        print(f"Deliberations table schema: {schema}")

        # Raw data
        try:
            raw_data = session.execute(text("SELECT * FROM deliberations;")).fetchall()
            print(f"Raw data from deliberations table: {raw_data}")
        except Exception as e:
            print(f"Could not fetch raw data: {e}")

        # ORM query
        orm_data = session.query(DeliberationORM).all()
        print(f"ORM query result: {orm_data}")

@app.get("/trial-v1/delibs/validate-user")
def validate_user_existence(request: Request):
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    print("Validate user existence procedure:", session_id)
    if not session_id:
        raise HTTPException(400, "No session cookie found.")

    with Session(engine) as sess:
        stmt = select(exists().where(DeliberationORM.unique_id == session_id))
        found = sess.execute(stmt).scalar() 
        if not found:
            raise HTTPException(404, "User does not have an initialized Deliberations instance.")
        
        return {
            "status": 200,
            "message": "Verified user has initialized a Deliberation structure."
        }
       
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
    
# adapter/wrapper for AWS & FastAPI 
handler = Mangum(app, lifespan='off')

def lambda_handler(event, context): 
    return handler(event, context)




    
    
