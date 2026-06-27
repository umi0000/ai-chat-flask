from . import db
from werkzeug.security import generate_password_hash,check_password_hash
import uuid
from datetime import datetime
class Users(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(120), nullable=False)
    privilege = db.Column(db.Enum('user','admin', validate_strings=True,nullable=False,native_enum=False,create_constraint=True),nullable=False)#validate_strings=True 表示开启写入时校验数据，不开的话仅读取时校验
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.now,
        onupdate=datetime.now
    )
    conversations = db.relationship(
        "Conversations",
        backref="user",
        cascade="all, delete-orphan"
    )
    def __repr__(self):
        return f'<User {self.username}>'
    def verify_password(self,password) -> bool:
        return check_password_hash(self.password_hash,password)
    def change_username(self,new_name):
        self.username = new_name
        db.session.commit()
    def change_password(self,password):
        self.password_hash = generate_password_hash(password)
        db.session.commit()

    
class Conversations(db.Model):
    __tablename__ = 'conversations'
    id = db.Column(db.Integer,primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    uuid = db.Column(db.String(36),nullable=False,default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(200), default="新会话")
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.now,
        onupdate=datetime.now
    )
    messages = db.relationship(
        "Messages",
        backref="conversation",
        cascade="all, delete-orphan"
    )
    def set_title(self,title):
        self.title=title
        db.session.commit()

class Messages(db.Model):
    __tablename__ = 'messages'
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=False)
    role = db.Column(db.Enum('user', 'assistant','system', validate_strings=True,nullable=False,native_enum=False,create_constraint=True),nullable=False)  
    content_json = db.Column(db.Text, nullable=False)
    model = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(
        db.DateTime,
        default=datetime.now,
        onupdate=datetime.now
    )

# class LlmProviders(db.Model):
#     __tablename__ = 'llm_providers'
#     id = db.Column(db.Integer,primary_key=True)
#     name = db.Column(db.String(50),nullable=False)
#     base_url = db.Column(db.String(200),nullable=False)
#     type = db.Column(db.Enum('openai_chat','openai_response',validate_strings=True,nullable=False,native_enum=False,create_constraint=True))
#     apikey
#     llmnames = db.relationship(
#         "LlmNames",
#         backref="provider",
#         cascade="all, delete-orphan"
#     )

# class LlmNames(db.Model):
#     __tablename__ = 'llm_names'
#     id = db.Column(db.Integer,primary_key=True)
#     provider_id = db.Column(db.Integer,db.ForeignKey("llm_providers.id"),nullable=False)
#     name = db.Column(db.String(20),nullable=False)



