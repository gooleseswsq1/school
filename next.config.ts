/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "100.115.158.11",
    "localhost",
    "192.168.1.23",
    "192.168.1.0/24",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "169.254.83.107",
    "169.254.0.0/16"
  ]
};

export default nextConfig;
