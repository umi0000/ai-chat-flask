from flask import Blueprint, redirect, render_template, session, url_for

from .models import Users


bp = Blueprint("pages", __name__)


def is_logged_in():
    return bool(session.get("username") and session.get("id"))


def is_admin():
    user_id = session.get("id")
    if not user_id:
        return False

    user = Users.query.filter_by(id=user_id).one_or_none()
    return bool(user and user.privilege == "admin")


@bp.route("/")
def index():
    if is_logged_in():
        return redirect("/chat")
    return redirect(url_for("pages.login_page"))


@bp.route("/login")
def login_page():
    if is_logged_in():
        return redirect("/chat")
    return render_template("login.html")


@bp.route("/chat")
def chat_page():
    if not is_logged_in():
        return redirect(url_for("pages.login_page"))
    return render_template("chat.html")


@bp.route("/settings")
def settings_page():
    if not is_logged_in():
        return redirect(url_for("pages.login_page"))
    return render_template("settings.html", is_admin=is_admin())


@bp.route("/admin")
def admin_page():
    if not is_logged_in() or not is_admin():
        return redirect(url_for("pages.login_page"))
    return render_template("admin.html")
