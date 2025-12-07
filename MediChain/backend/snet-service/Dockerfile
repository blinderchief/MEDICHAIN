# MediChain SNET Service - Dockerfile for SingularityNET Marketplace Deployment
# This container runs the gRPC service that snet-daemon proxies to

FROM python:3.11-slim as base

# Prevent Python from writing pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    wget \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir grpcio grpcio-tools protobuf

# Install snet-sdk for marketplace integration
RUN pip install --no-cache-dir snet-sdk

# Install application dependencies
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn \
    sqlmodel \
    aiohttp \
    google-generativeai \
    pydantic \
    pydantic-settings

# ============================================
# Stage 2: Production image
# ============================================
FROM python:3.11-slim as production

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/src:/app/snet-service

WORKDIR /app

# Copy Python packages from base
COPY --from=base /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=base /usr/local/bin /usr/local/bin

# Copy application code
COPY src/ ./src/
COPY snet-service/ ./snet-service/

# Compile protocol buffers
WORKDIR /app/snet-service
RUN python compile_proto.py

# Expose gRPC port
EXPOSE 7000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import grpc; ch = grpc.insecure_channel('localhost:7000'); grpc.channel_ready_future(ch).result(timeout=5)" || exit 1

# Run the gRPC service
CMD ["python", "grpc_service.py", "--port", "7000"]


# ============================================
# Stage 3: Development image with daemon
# ============================================
FROM production as with-daemon

# Install snet-daemon
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Download snet-daemon binary
ARG SNETD_VERSION=5.1.4
RUN wget -q https://github.com/singnet/snet-daemon/releases/download/v${SNETD_VERSION}/snetd-linux-amd64-v${SNETD_VERSION} \
    -O /usr/local/bin/snetd && \
    chmod +x /usr/local/bin/snetd

# Copy daemon config
COPY snet-service/snetd.config.json /app/snet-service/

# Expose daemon port
EXPOSE 7001

# Create entrypoint script
RUN echo '#!/bin/bash\n\
# Start gRPC service in background\n\
python /app/snet-service/grpc_service.py --port 7000 &\n\
GRPC_PID=$!\n\
\n\
# Wait for gRPC to start\n\
sleep 3\n\
\n\
# Start snet-daemon\n\
cd /app/snet-service && snetd --config snetd.config.json &\n\
DAEMON_PID=$!\n\
\n\
# Handle shutdown\n\
trap "kill $GRPC_PID $DAEMON_PID 2>/dev/null" EXIT\n\
\n\
# Wait for processes\n\
wait $DAEMON_PID\n\
' > /entrypoint.sh && chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
