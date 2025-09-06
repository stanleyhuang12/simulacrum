FROM public.ecr.aws/lambda/python:3.11


COPY requirements.txt .
# gcc, postgresql-devel python3-devel are C dependencies needed for psycopg2-binaryaws ecr describe-repositories --repository-names my-app

RUN yum install -y git gcc postgresql-devel python3-devel 

RUN pip install --upgrade pip
RUN pip install -r requirements.txt -t "${LAMBDA_TASK_ROOT}"


COPY main.py simulacrum.py ${LAMBDA_TASK_ROOT}/


CMD [ "main.handler" ]

