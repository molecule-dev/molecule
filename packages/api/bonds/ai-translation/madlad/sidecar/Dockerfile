# MADLAD-400 translation server for @molecule/api-ai-translation-madlad.
#
#   docker build -t madlad-sidecar .
#   docker run -p 8765:8765 -v madlad-model:/model madlad-sidecar
#
# The model (~2.96 GB, int8) is downloaded into /model on first start and
# hash-checked; keep /model on a volume so restarts do not download it again.
# CPU by default. For an NVIDIA GPU, build FROM an nvidia/cuda runtime image
# with Python 3.12 instead and run with MADLAD_DEVICE=cuda
# MADLAD_COMPUTE_TYPE=int8_float16 (the CTranslate2 wheel includes CUDA support).
FROM python:3.12-slim

RUN useradd --create-home --uid 10001 madlad \
  && mkdir /model && chown madlad /model
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY server.py .

USER madlad
ENV MADLAD_MODEL_DIR=/model \
    MADLAD_HOST=0.0.0.0 \
    MADLAD_PORT=8765
EXPOSE 8765
VOLUME ["/model"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=600s \
  CMD python -c "import urllib.request,os,sys; r=urllib.request.Request('http://127.0.0.1:8765/health', headers={'Authorization': 'Bearer ' + os.environ.get('MADLAD_API_KEY','')}); sys.exit(0 if urllib.request.urlopen(r).status == 200 else 1)"
CMD ["python", "server.py"]
