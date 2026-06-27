from app import create_app
from waitress import serve
PORT = 3724
app = create_app()

if __name__ == "__main__":
    print(f"已在{PORT}端口启动！")
    serve(app, host="0.0.0.0", port=PORT, threads=4)