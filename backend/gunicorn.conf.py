import multiprocessing

# Bind ke localhost port 8000 (Nginx akan meneruskannya ke sini)
bind = "127.0.0.1:8000"

# Rumus Optimal KVM 2 Hostinger (2 vCPU x 2 + 1) = 5 Workers
workers = 5
worker_class = "uvicorn.workers.UvicornWorker"

# Mencegah Timeout saat proses upload Excel besar
timeout = 300
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
