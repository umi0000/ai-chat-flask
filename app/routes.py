from flask import request,jsonify,session,Blueprint
from . import db
from .models import Messages,Conversations
from sqlalchemy.exc import NoResultFound
from langchain_core.messages import SystemMessage,HumanMessage,AIMessage
import json
from .call_llms import Call

#大爱nagi酱
#nagi -> wlp
bp = Blueprint("routes",__name__,url_prefix="/api")

def login_check():
    if session.get("username") and session.get("id"):
        return [session.get("id"),session.get("username")]
    else:
        return None
    

def messages_raw_to_request(messages_raw):
    messages_request=[]
    for i in messages_raw:
        content_json_str = i.content_json
        content_json = json.loads(content_json_str)
        if i.role == "user":
            messages_request.append(HumanMessage(content=content_json))
        elif i.role == "assistant":
            messages_request.append(AIMessage(content=content_json))
        elif i.role == "system":
            messages_request.append(SystemMessage(content=content_json))
    return messages_request

def messages_raw_to_display(messages_raw):
    messages_display=[]
    for i in messages_raw:
        content_json_str = i.content_json
        content_json = json.loads(content_json_str)
        if i.role == "user":
            messages_display.append(
                {
                    "role":"user",
                    "model":i.model,
                    "content":content_json
                }
            )
        elif i.role == "assistant":
            messages_display.append(
                {
                    "role":"assistant",
                    "model":i.model,
                    "content":content_json
                }
            )
        elif i.role == "system":
            messages_display.append(
                {
                    "role":"system",
                    "content":content_json
                }
            )
    return messages_display
        
    
@bp.route("/conversations",methods=["GET","POST"])
def conversations():
    if login_check():
        user_id = login_check()[0]
        username = login_check()[1]
        if request.method=="POST":
            conversation = Conversations(user_id=user_id)
            db.session.add(conversation)
            db.session.commit()
            return jsonify({"success":True,"uuid":conversation.uuid})
        elif request.method=="GET":
            conversation_list = Conversations.query.filter_by(user_id=user_id).order_by(Conversations.updated_at.desc()).all()
            conversation_list_return=[]
            for i in conversation_list:
                conversation_list_return.append({"title":i.title,"uuid":i.uuid,"updated_at":i.updated_at})
            return jsonify(conversation_list_return)
    else:
        return jsonify("Unauthorized"),401
            
@bp.route("/conversations/<uuid:conversation_uuid>/messages",methods=["GET","DELETE"])
def get_messages(conversation_uuid):
    if login_check():
        if request.method=="GET":
            try:
                conversation = Conversations.query.filter_by(uuid=str(conversation_uuid),user_id=session.get("id")).one() #获取当前请求的conversation，用来获取conversation_id，这将用来寻找对应的messages
                #这样做还有一个好处，就是根据conversation_id查找对应的conversation，获取id，根据conversation_id找messages，虽然message只和conversation_id绑定了，但是查找conversation_id需要进行user_id校验，避免了用户查看其他用户的消息
                messages_raw = Messages.query.filter_by(conversation_id=conversation.id).all()
                messages_display = messages_raw_to_display(messages_raw)
                return jsonify(messages_display)
            except NoResultFound:
                return jsonify("no such conversation"),404
        elif request.method=="DELETE":
            try:
                conversation = Conversations.query.filter_by(uuid=str(conversation_uuid),user_id=session.get("id")).one() #获取当前请求的conversation，用来获取conversation_id，这将用来寻找对应的messages
                #这样做还有一个好处，就是根据conversation_id查找对应的conversation，获取id，根据conversation_id找messages，虽然message只和conversation_id绑定了，但是查找conversation_id需要进行user_id校验，避免了用户查看其他用户的消息
                db.session.delete(conversation)
                db.session.commit()
                return jsonify(f"successfully deleted{str(conversation_uuid)}")
            except NoResultFound:
                return jsonify("no such conversation"),404
    else:
        return jsonify("Unauthorized"),401

@bp.route("/chat",methods=["POST"])
def chat():
    if login_check():
        data = request.get_json()
        conversation_uuid = data.get("conversation_uuid")
        message_to_add = str(data.get("message"))
        requested_model = data.get("requested_model")
        provider = data.get("provider")
        try:
            conversation = Conversations.query.filter_by(uuid=str(conversation_uuid),user_id=session.get("id")).one() #获取当前请求的conversation，用来获取conversation_id，这将用来寻找对应的messages
            #这样做还有一个好处，就是根据conversation_id查找对应的conversation，获取id，根据conversation_id找messages，虽然message只和conversation_id绑定了，但是查找conversation_id需要进行user_id校验，避免了用户查看其他用户的消息
        except NoResultFound:
            return jsonify("no such conversation"),404
        # 创建一条messages记录
        message = Messages(
            conversation_id=conversation.id,
            role="user",
            content_json=json.dumps([#目前不兼容files
                {#手动拼接出HumanMessage.content的格式
                    "type":"text",
                    "text":message_to_add
                }
            ],ensure_ascii=False),
            model=requested_model
            )
        #添加这条记录到数据库
        db.session.add(message)
        db.session.commit()
        messages_raw = Messages.query.filter_by(conversation_id=conversation.id).all()
        message_request = messages_raw_to_request(messages_raw)
        call = Call()
        return call.send_stream(message_request,conversation.id,requested_model,provider)
        ## 创建一条message记录，保存ai的回复
        # message = Messages(
        #     conversation_id=conversation.id,
        #     role="assistant",
        #     content_json=json.dumps(llm_resp.content,ensure_ascii=False),
        #     model=requested_model
        # )
        # #添加这条记录到数据库
        # db.session.add(message)
        # db.session.commit()
        # return jsonify({"llm_resp":llm_resp.content,"usage":llm_resp.usage_metadata})
        # print(message_request)
        # return jsonify("成功创建message_request，等待调用模型吧（测试消息）")
    else:
        return jsonify("Unauthorized"),401

@bp.route("/conversations/<uuid:conversation_uuid>/rename",methods=["POST"])
def rename(conversation_uuid):
    if login_check():
        data = request.get_json()
        # is_auto = data.get("is_auto") #0 or 1
        new_name = data.get("new_name")
        try:
            conversation = Conversations.query.filter_by(uuid=str(conversation_uuid),user_id=session.get("id")).one() #获取当前请求的conversation，用来获取conversation_id，这将用来寻找对应的messages
            #这样做还有一个好处，就是根据conversation_id查找对应的conversation，获取id，根据conversation_id找messages，虽然message只和conversation_id绑定了，但是查找conversation_id需要进行user_id校验，避免了用户查看其他用户的消息
            # if is_auto:
            #     messages_raw = Messages.query.filter_by(conversation_id=conversation.id).all()
            #     messages_latest = Messages.query.filter_by(conversation_id=conversation.id).first()
            #     lastest_model = messages_latest.model
            #     messages_request = messages_raw_to_request(messages_raw)
            #     call = Call()
            #     call.send(messages_request,conversation.id,lastest_model)
            conversation.title = new_name
            db.session.commit()
            return jsonify(f"successfully updated {str(conversation_uuid)} 's title:{new_name}")
        except NoResultFound:
            return jsonify("no such conversation"),404
    else:
        return jsonify("Unauthorized"),401

@bp.route("/models",methods=["GET"])
def get_models():
    if login_check():
        with open("llm_config.json","r",encoding="utf-8") as f:
            llm_config = json.load(f)
            llm_config_display = []
            for i in llm_config:
                llm_config_display.append({"model_name":i.get("model_name"),"provider":i.get("provider"),"type":i.get("type")})
            return jsonify(llm_config_display)
    else:
        return jsonify("Unauthorized"),401