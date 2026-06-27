#当app被导入时,__init__.py会被执行，create_app函数会被调用，返回一个Flask app实例
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import secrets
from datetime import timedelta
import os
from werkzeug.security import generate_password_hash



db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    # 生成一个安全的随机密钥（只在首次运行时生成即可）
    # secrets.token_hex() 产生 64 字符的十六进制随机字符串
    app.secret_key = secrets.token_hex()
    # app.config["SECRET_KEY"] = "dev-secret-key"
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///local.db'
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config.update(
       # SECRET_KEY=os.environ["SECRET_KEY"],
        PERMANENT_SESSION_LIFETIME=timedelta(hours=5), #永久cookie过期时间
        SESSION_COOKIE_HTTPONLY=True, #不允许js读取session cookie
        SESSION_COOKIE_SECURE=False, #True=只允许https传输session cookie，开发环境得设置为False
        SESSION_COOKIE_SAMESITE="Lax",
    )
# Strict：最严格，跨站基本不带 Cookie
# Lax：比较平衡，大多数普通跳转允许，危险跨站 POST 不带
# None：跨站也带 Cookie，但必须配合 Secure=True
    # 确保 instance 目录存在
    os.makedirs(app.instance_path, exist_ok=True)
    # sqlite:///app.db 默认会放在 instance/app.db
    db_path = os.path.join(app.instance_path, "local.db")
    # 在 create_all() 之前判断数据库文件是否已经存在
    db_existed = os.path.exists(db_path)
    
    db.init_app(app)
    from .auth import bp as auth_bp #必须在这里导入，而不是在开头导入，因为auth依赖于db，但是在开头导入db还没被创建
    app.register_blueprint(auth_bp)
    from .routes import bp as routes_bp
    app.register_blueprint(routes_bp)
    from .admin import bp as admin_bp
    app.register_blueprint(admin_bp)
    from . import models
    CORS(app, supports_credentials=True) 

    with app.app_context(): #此时flask不知道要运行哪个app，所以要手动with app.app_context()
        db.create_all() #在当前app的上下文中创建所有表
        if not db_existed:
            admin = models.Users.query.filter_by(username="admin").first()
            if not admin:
                init_admin = models.Users(username="admin",password_hash=generate_password_hash("$%bdEtTZv&8%u2"),privilege="admin")
                db.session.add(init_admin)
                db.session.commit()
                print("首次启动，添加了管理员用户admin，密码admin123，请及时修改密码！")
    return app


