from flask import Blueprint, redirect, render_template, session, url_for


bp = Blueprint("pages", __name__)


def is_logged_in():
    return bool(session.get("username") and session.get("id"))


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
    return "设置页面待开发"
