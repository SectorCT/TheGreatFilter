FROM public.ecr.aws/docker/library/python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /home/app

COPY requirements.txt /home/app/

RUN pip install --upgrade pip && pip install -r requirements.txt

COPY backend/ /home/app/backend/

WORKDIR /home/app/backend

EXPOSE 8000

# Long timeout so large AppImage/exe downloads over slow links are not killed mid-transfer.
CMD ["sh", "-c", "python manage.py makemigrations && python manage.py migrate && gunicorn backend.wsgi:application --bind 0.0.0.0:8000 --timeout 600 --workers 2"]
