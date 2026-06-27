from flask import request,jsonify,session,Blueprint
from werkzeug.security import generate_password_hash,check_password_hash
from . import db
from .models import Users
from .admin import check_password_strength
bp = Blueprint(name="auth_bp",import_name=__name__,url_prefix="/api/auth")

@bp.route("/login",methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    user = Users.query.filter_by(username=username).one_or_none()
    if user:
        if user.verify_password(password):
            session["username"]=username
            session["id"]=user.id
            return jsonify({"success":True,"username":username})
        else:
            return jsonify("用户名或密码错误"),403
    else:
        return jsonify("用户名或密码错误"),403

# @bp.route("/register",methods=["POST"])
# def register():
#     data = request.get_json()
#     username = data.get("username")
#     password = data.get("password")
#     existing_usernames = Users.query.all()
#     for i in range(len(existing_usernames)):
#         existing_usernames[i] = existing_usernames[i].username
#     if username in existing_usernames:
#         return jsonify("用户名已存在"), 403
#     elif username == "" or password == "":
#         return jsonify("用户名或密码不能为空"),403
#     user = Users(username=username,password_hash=generate_password_hash(password))
#     db.session.add(user)
#     db.session.commit()
#     return jsonify("success!")

@bp.route("/logout",methods=["POST"])
def logout():
    if session.get("username"):
        session.clear()
        return jsonify("logout success")    
    return jsonify("failed to logout"),401

@bp.route("/me",methods=["GET"])
def me(): 
    if session.get("username"):
        return jsonify({"id":session.get("id"),"username":session.get("username")})            
    else:
        return jsonify("Unauthorized"),401

@bp.route("/me/change_username",methods=["POST"])
def change_username():
    id = session.get("id")
    data = request.get_json()
    new_username = data.get("new_username")
    if id:
        existing_usernames = Users.query.all()
        for i in range(len(existing_usernames)):
            existing_usernames[i] = existing_usernames[i].username
        if new_username in existing_usernames:
            return jsonify("用户名已存在"), 403
        if new_username == "":
            return jsonify("用户名不能为空"),403
        user = Users.query.filter_by(id=id).one_or_404()
        user.username = new_username
        db.session.commit()
        session.clear()
        return jsonify(f"successfully updated username to {new_username}")
    else:
        return jsonify("Unauthorized"),401
    

@bp.route("/me/change_password",methods=["POST"])
def change_password():
    id = session.get("id")
    data = request.get_json()
    old_password = data.get("old_password")
    new_password = data.get("new_password")
    if id:
        is_valid,errors = check_password_strength(new_password)
        if is_valid:
            user = Users.query.filter_by(id=id).one_or_404()
            if check_password_hash(user.password_hash,old_password):
                user.password_hash = generate_password_hash(new_password)
                db.session.commit()
                session.clear()
                return jsonify("success!")
            else:
                return jsonify("原密码错误"),403
        else:
            return jsonify(errors),403
    else:
        return jsonify("Unauthorized"),401
            
