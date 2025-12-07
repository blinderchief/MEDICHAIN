# MediChain - SingularityNET Marketplace Deployment Guide

## Overview

This guide walks you through deploying MediChain's Clinical Trial Matcher as a paid AI service on the SingularityNET decentralized marketplace. Once deployed, your service will earn FET (previously AGIX) tokens for every API call.

**Service Details:**
- **Organization**: `medichain-health`
- **Service ID**: `clinical-trial-matcher`
- **Service Type**: gRPC
- **Pricing**: 10 cogs per call (~$0.001)
- **Free Calls**: 20 (for demo/testing)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SingularityNET Marketplace                    │
│                 https://marketplace.singularitynet.io            │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ HTTPS/gRPC
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Your Server                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    snet-daemon                           │   │
│  │  - Handles FET payments via MPE                          │   │
│  │  - Authenticates marketplace calls                       │   │
│  │  - Port: 7001 (public)                                  │   │
│  └───────────────────────────┬─────────────────────────────┘   │
│                              │ localhost:7000                    │
│  ┌───────────────────────────▼─────────────────────────────┐   │
│  │              MediChain gRPC Service                      │   │
│  │  - ClinicalTrialMatcher implementation                  │   │
│  │  - Powered by Gemini AI + MatcherAgent                  │   │
│  │  - Port: 7000 (internal)                                │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Prerequisites

### 1. System Requirements
- Python 3.11+
- Docker (optional, for containerized deployment)
- 512MB+ RAM
- Port 7001 accessible from internet

### 2. FET Tokens
You need FET tokens for:
- Gas fees for publishing (~0.1 FET)
- Initial MPE escrow (recommended: 10 FET)

Get FET tokens:
- [SingularityNET Faucet (testnet)](https://faucet.singularitynet.io/)
- [Buy on exchanges](https://www.coingecko.com/en/coins/fetch-ai)

### 3. Install snet-cli

```bash
# Install via pip
pip install snet-cli

# Verify installation
snet version
```

## Setup Steps

### Step 1: Create Identity

```bash
# Create identity with your Ethereum private key
snet identity create medichain-publisher key \
    --private-key <YOUR_PRIVATE_KEY>

# Set as active identity
snet identity medichain-publisher

# Verify
snet identity list
```

### Step 2: Configure Network

```bash
# Use mainnet for production
snet network mainnet

# Or use Sepolia testnet for testing
snet network sepolia

# Verify
snet network
```

### Step 3: Create Organization

```bash
# Initialize organization metadata
snet organization metadata-init medichain-health \
    --org-type individual \
    --display-name "MediChain Health AI" \
    --description "Decentralized Clinical Trial Matching powered by AI"

# Add organization members (optional)
snet organization metadata-add-members \
    --members <ADDITIONAL_WALLET_ADDRESS>

# Create organization on blockchain
snet organization create medichain-health
```

### Step 4: Configure Service Metadata

```bash
cd backend/snet-service

# Initialize service metadata
snet service metadata-init \
    --metadata-file service_metadata.json \
    --display-name "MediChain Clinical Trial Matcher" \
    --encoding proto \
    --service-type grpc \
    --group-name default_group

# Set pricing (10 cogs = 0.00000001 FET per call)
snet service metadata-set-fixed-price \
    --metadata-file service_metadata.json \
    --group-name default_group \
    --price 10

# Set free calls (20 free calls for demo)
snet service metadata-set-free-calls \
    --metadata-file service_metadata.json \
    --group-name default_group \
    --free-calls 20
```

### Step 5: Add Endpoints

```bash
# Add your public endpoint
snet service metadata-add-endpoints \
    --metadata-file service_metadata.json \
    --group-name default_group \
    --endpoints https://your-domain.com:7001

# For multiple regions
snet service metadata-add-endpoints \
    --metadata-file service_metadata.json \
    --group-name default_group \
    --endpoints https://us-east.your-domain.com:7001 \
                https://eu-west.your-domain.com:7001
```

### Step 6: Publish Service

```bash
# Publish to blockchain
snet service publish medichain-health clinical-trial-matcher \
    --metadata-file service_metadata.json

# Verify publication
snet service print-metadata medichain-health clinical-trial-matcher
```

## Deployment Options

### Option A: Direct Deployment (Recommended for VPS)

```bash
cd backend/snet-service

# 1. Compile protocol buffers
python compile_proto.py

# 2. Start in development mode (testing)
python run_snet_service.py --mode dev

# 3. Start with daemon (production)
python run_snet_service.py --mode daemon
```

### Option B: Docker Deployment

```bash
cd backend

# Build production image
docker build -f snet-service/Dockerfile -t medichain-snet:latest .

# Run gRPC service only
docker run -d \
    --name medichain-grpc \
    -p 7000:7000 \
    -e GEMINI_API_KEY=your_key \
    -e DATABASE_URL=your_db_url \
    medichain-snet:latest

# Run with daemon
docker build -f snet-service/Dockerfile --target with-daemon -t medichain-snet:daemon .

docker run -d \
    --name medichain-daemon \
    -p 7001:7001 \
    -v /path/to/snetd.config.json:/app/snet-service/snetd.config.json \
    -e GEMINI_API_KEY=your_key \
    medichain-snet:daemon
```

### Option C: Docker Compose

Add to your `docker-compose.yml`:

```yaml
services:
  medichain-snet:
    build:
      context: ./backend
      dockerfile: snet-service/Dockerfile
      target: with-daemon
    ports:
      - "7001:7001"
    environment:
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - DATABASE_URL=${DATABASE_URL}
    volumes:
      - ./backend/snet-service/snetd.config.json:/app/snet-service/snetd.config.json
    restart: unless-stopped
```

## Testing Your Service

### Local Testing with grpcurl

```bash
# Install grpcurl
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest

# Test HealthCheck
grpcurl -plaintext localhost:7000 medichain.ClinicalTrialMatcher/HealthCheck

# Test MatchTrials
grpcurl -plaintext -d '{
  "patient_id": "test-001",
  "conditions": ["breast cancer", "stage 2"],
  "biomarkers": [{"name": "HER2", "value": "positive", "unit": "status"}],
  "age": 55,
  "gender": "female"
}' localhost:7000 medichain.ClinicalTrialMatcher/MatchTrials
```

### Test via snet-cli

```bash
# After publishing, test your service
snet client call medichain-health clinical-trial-matcher \
    default_group MatchTrials \
    '{"patient_id": "test-001", "conditions": ["lung cancer"]}'
```

### Test via Marketplace UI

1. Go to: https://marketplace.singularitynet.io/servicedetails/org/medichain-health/service/clinical-trial-matcher
2. Connect MetaMask wallet
3. Click "Free Trial" or deposit FET
4. Use the demo interface

## Monitoring & Maintenance

### Check Service Status

```bash
# View service info
snet service print-metadata medichain-health clinical-trial-matcher

# Check daemon status
curl http://localhost:7001/encoding
```

### Update Service

```bash
# Update metadata
snet service metadata-set-description \
    --metadata-file service_metadata.json \
    --description "Updated description"

# Push update to blockchain
snet service update-metadata medichain-health clinical-trial-matcher \
    --metadata-file service_metadata.json
```

### View Earnings

```bash
# Check MPE balance
snet account balance

# Claim earnings
snet treasurer claim-all --endpoint https://your-endpoint:7001
```

## Troubleshooting

### Service not appearing on marketplace
- Verify transaction confirmed on blockchain explorer
- Check organization is created: `snet organization info medichain-health`
- Ensure endpoints are publicly accessible

### gRPC connection errors
- Check firewall allows port 7001
- Verify SSL certificate if using HTTPS
- Test with grpcurl locally first

### Payment errors
- Ensure sufficient FET in MPE channel
- Check daemon config has correct private key
- Verify network configuration matches

### Proto compilation errors
```bash
# Reinstall grpcio-tools
pip install --upgrade grpcio-tools

# Clear cached files
rm -f medichain_pb2*.py
python compile_proto.py
```

## Cost Breakdown

| Item | Cost | Notes |
|------|------|-------|
| Organization creation | ~0.01 FET | One-time, gas fee |
| Service publication | ~0.01 FET | One-time, gas fee |
| Update metadata | ~0.005 FET | Per update, gas fee |
| Server hosting | $5-50/month | VPS or cloud |
| Revenue per call | +10 cogs | Your earning! |

## Security Best Practices

1. **Never expose private key** - Use environment variables
2. **Use HTTPS** - Get SSL cert from Let's Encrypt
3. **Rate limiting** - Configure in daemon
4. **Monitoring** - Set up alerts for service health
5. **Backup** - Keep service_metadata.json safe

## Support & Resources

- **SingularityNET Discord**: https://discord.gg/snet
- **Developer Portal**: https://dev.singularitynet.io/
- **SDK Documentation**: https://github.com/singnet/snet-sdk-python
- **Daemon Documentation**: https://github.com/singnet/snet-daemon

---

## Quick Start Commands

```bash
# Complete deployment in 5 minutes

# 1. Setup identity
snet identity create medichain key --private-key $PRIVATE_KEY
snet network mainnet

# 2. Create organization
snet organization metadata-init medichain-health --org-type individual
snet organization create medichain-health

# 3. Publish service
cd backend/snet-service
snet service publish medichain-health clinical-trial-matcher \
    --metadata-file service_metadata.json

# 4. Start service
docker-compose up -d medichain-snet

# 5. Verify
curl https://marketplace.singularitynet.io/api/v1/services/medichain-health/clinical-trial-matcher
```

**Congratulations! Your AI service is now live on the SingularityNET marketplace! 🎉**
