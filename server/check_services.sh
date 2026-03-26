#!/bin/bash

echo "==================================="
echo "The Great Filter Services Health Check"
echo "==================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Docker is running
echo "1. Checking Docker..."
if docker info > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Docker is running"
else
    echo -e "${RED}✗${NC} Docker is NOT running - Please start Docker Desktop"
    exit 1
fi
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}✗${NC} Not in server directory. Please cd to server/"
    exit 1
fi

# Check services status
echo "2. Checking Docker Compose services..."
docker-compose ps --format "table {{.Name}}\t{{.Status}}"
echo ""

# Check specific ports
echo "3. Checking ports..."
echo -n "   Port 6379 (Redis): "
if nc -z localhost 6379 2>/dev/null || netstat -an | grep -q ":6379.*LISTEN" 2>/dev/null; then
    echo -e "${GREEN}✓ Open${NC}"
else
    echo -e "${RED}✗ Closed${NC}"
fi

echo -n "   Port 5434 (PostgreSQL): "
if nc -z localhost 5434 2>/dev/null || netstat -an | grep -q ":5434.*LISTEN" 2>/dev/null; then
    echo -e "${GREEN}✓ Open${NC}"
else
    echo -e "${RED}✗ Closed${NC}"
fi

echo -n "   Port 8002 (Orchestrator): "
if nc -z localhost 8002 2>/dev/null || netstat -an | grep -q ":8002.*LISTEN" 2>/dev/null; then
    echo -e "${GREEN}✓ Open${NC}"
else
    echo -e "${RED}✗ Closed - ORCHESTRATOR NOT RUNNING!${NC}"
fi

echo -n "   Port 8000 (Backend): "
if nc -z localhost 8000 2>/dev/null || netstat -an | grep -q ":8000.*LISTEN" 2>/dev/null; then
    echo -e "${GREEN}✓ Open${NC}"
else
    echo -e "${RED}✗ Closed${NC}"
fi
echo ""

# Check orchestrator health
echo "4. Checking Orchestrator health..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8002/health 2>/dev/null)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Orchestrator is healthy"
    curl -s http://localhost:8002/health | python -m json.tool 2>/dev/null || echo "   (Health check passed but response not JSON)"
else
    echo -e "${RED}✗${NC} Orchestrator health check failed (HTTP $HEALTH_RESPONSE)"
    echo "   This is why you're getting 502 errors!"
fi
echo ""

# Check backend health
echo "5. Checking Backend health..."
BACKEND_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/execution-stats/ 2>/dev/null)
if [ "$BACKEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Backend is responding"
else
    echo -e "${YELLOW}⚠${NC} Backend returned HTTP $BACKEND_RESPONSE"
fi
echo ""

# Summary
echo "==================================="
echo "Summary"
echo "==================================="
if [ "$HEALTH_RESPONSE" = "200" ] && [ "$BACKEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ All services are running correctly!${NC}"
    echo ""
    echo "You can now:"
    echo "  - Start frontend: cd ../client && npm run dev"
    echo "  - Access app: http://localhost:8080"
    echo ""
else
    echo -e "${RED}✗ Some services are not working${NC}"
    echo ""
    echo "To fix:"
    echo "  1. Stop services: docker-compose down"
    echo "  2. Start services: docker-compose up --build"
    echo "  3. Wait 5-10 minutes for build"
    echo "  4. Run this script again"
    echo ""
fi

