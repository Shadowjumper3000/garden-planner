#!/bin/bash
#
# Script to generate self-signed SSL certificates for development and testing
# Do NOT use these certificates in production!
#

# Create ssl directory if it doesn't exist
mkdir -p ssl

echo "Generating SSL certificates for development..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem \
  -out ssl/cert.pem \
  -subj "/C=US/ST=State/L=City/O=Garden Planner/OU=Development/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Certificates generated in ./ssl/ directory"
echo "cert.pem - SSL certificate"
echo "key.pem - SSL private key"
echo ""
echo "IMPORTANT: These certificates are for development only. For production,"
echo "use certificates from a trusted Certificate Authority."