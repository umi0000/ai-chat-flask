from . import db
from flask import request,session,Blueprint,jsonify
from .models import Users
from werkzeug.security import generate_password_hash
import string
from sqlalchemy.exc import IntegrityError,StatementError

def admin_check():
    id = session.get("id")
    if id:
        user_raw = Users.query.filter_by(id=id).one_or_none()
        if user_raw.privilege == "admin":
            return True
    else:
        return False

def check_password_strength(password: str):
    """
    检查密码强度。
    1. 至少 11 个字符
    2. 至少包含一个大写字母
    3. 至少包含一个小写字母
    4. 至少包含一个数字
    5. 至少包含一个特殊字符
    return:
    (True, []) 表示通过
    (False, errors) 表示不通过，errors 是错误原因列表
    """
    errors = []
    if not isinstance(password, str):
        return False, ["密码必须是字符串"]
    if len(password) < 11:
        errors.append("密码长度至少需要 11 个字符")
    if not any(char.isupper() for char in password):
        errors.append("密码至少需要包含一个大写字母")
    if not any(char.islower() for char in password):
        errors.append("密码至少需要包含一个小写字母")
    if not any(char.isdigit() for char in password):
        errors.append("密码至少需要包含一个数字")
    special_chars = string.punctuation
    if not any(char in special_chars for char in password):
        errors.append("密码至少需要包含一个特殊字符")
    return len(errors) == 0, errors





bp = Blueprint("admin_bp",__name__,url_prefix="/api/admin")

@bp.route("/useradd",methods=["POST"])
def useradd():
    if admin_check():
        data = request.get_json()
        username = data.get("username")
        password = data.get("password")
        privilege = data.get("privilege")
        existing_usernames = Users.query.all()
        for i in range(len(existing_usernames)):
            existing_usernames[i] = existing_usernames[i].username
        if username in existing_usernames:
            return jsonify("用户名已存在"), 403
        elif username == "" or password == "":
            return jsonify("用户名或密码不能为空"),403
        isvalid,errors = check_password_strength(password)
        if isvalid:
            try:
                user = Users(username=username,password_hash=generate_password_hash(password),privilege=privilege)
                db.session.add(user)
                db.session.commit()
                return jsonify("success!")
            except StatementError:
                return jsonify("请插入正确的用户privilege类型:admin or user"),403
        else:
            return jsonify(errors)
    else:
        return jsonify("Unauthorized"),401
    

@bp.route("/userdel",methods=["POST"])
def userdel():
    if admin_check():
        data=request.get_json()
        user_id = data.get("id")
        if user_id == session.get("id"):
            return jsonify("E:不能删除自己"),403
        user = Users.query.filter_by(id=user_id).one_or_404()
        db.session.delete(user)
        db.session.commit()
        return jsonify(f"successfully deleted {user_id}")
    else:
        return jsonify("Unauthorized"),401

@bp.route("/users",methods=["GET"])
def list_users():
    if admin_check():
        users_raw = Users.query.all()
        users_display = []
        for i in users_raw:
            users_display.append({"id":i.id,"name":i.username,"privilege":i.privilege,"created_at":i.created_at,"updated_at":i.updated_at})
        return jsonify(users_display)
    else:
        return jsonify("Unauthorized"),401


