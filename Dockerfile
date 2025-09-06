FROM public.ecr.aws.lambda/python:3.11


COPY requirements.txt .


RUN pip install --upgrade pip
RUN pip install -r requirements.txt -t "${LAMBDA_TASK_ROOT}"


COPY main.py simulacrum.py ${LAMBDA_TASK_ROOT}/


CMD [ "main.handler" ]

