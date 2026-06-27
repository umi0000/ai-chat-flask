from flask import Flask,request,jsonify,session,Blueprint
from werkzeug.security import generate_password_hash,check_password_hash
from . import db
from .models import Users,Messages,Sessions

bp = Blueprint("pages",__name__)