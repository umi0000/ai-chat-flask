from langchain_openai import ChatOpenAI
import os
from dotenv import load_dotenv
import time
from langchain_core.callbacks import BaseCallbackHandler
from flask import jsonify,stream_with_context,Response
import json
from .models import Messages
from . import db

# class StreamMonitor(BaseCallbackHandler):
#         def __init__(self):
#             self.completaion_tokens = 0
#             self.start_time = 0
#             self.end_time=0
#             # logging.basicConfig(
#             #     filename="performance_log.log",
#             #     level=logging.INFO,
#             #     format="%(asctime)s | %(levelname)s | %(message)s"
#             # )
#         def on_llm_start(self, serialized, prompts, **kwargs):
#             self.start_time = time.time()
#         def on_llm_new_token(self, token: str, **kwargs):
#             self.completaion_tokens += 1
#         def on_llm_end(self, response, **kwargs):
#             self.end_time = time.time()
#             duration = self.end_time-self.start_time
#             speed = self.completaion_tokens/duration
#             # st.write(f"===========Finished,耗时:{duration:0.2f}s,回答token数:{self.completaion_tokens},平均速度:{speed:0.2f}tokens/s===========")
#             # logging.info(f"Success! Model:{st.session_state["current_log_model"]}  duration:{duration:0.2f}s  response_tokens:{self.completaion_tokens}  speed:{speed:0.2f}tokens/s ")
#         def on_llm_error(self, error, **kwargs):
#             return jsonify("llm error!")
#             # st.write("error!")
#             # logging.error(f"Error! Model:{st.session_state["current_log_model"]}")

# performance_montior = StreamMonitor()

def load_llms():
    with open("llm_config.json","r",encoding="utf-8") as f:
        config = json.load(f)
        return config



class Call:
    def send(self,messages_request):
        # full_response = ""
        # loading = 1
        llm_resp = self.llm1.invoke(messages_request)
        #return llm_resp.content,llm_resp.usage_metadata
        return llm_resp
    def send_stream(self,messages_request,conversation_id,model,provider):
        llm_config = load_llms()
        current_llm_config = None
        for i in llm_config:
            if i.get("provider") == provider and i.get("model_name")==model:
                current_llm_config = i
        if not current_llm_config:
            return jsonify("当前模型不存在，请检查模型名称和供应商名称"),404
        if current_llm_config.get("type")=="openai":
            current_llm = ChatOpenAI(
                    api_key=current_llm_config.get("api_key"),
                    base_url=current_llm_config.get("base_url"),
                    model=current_llm_config.get("model_name"),
                    temperature=0.7,  # 控制创造性
                    streaming=True,
                    stream_usage=True,
                    use_responses_api=True
                )
#青山なぎさが大好きです
        def generator():
            full_resp_content = ""
            for chunk in current_llm.stream(messages_request):
                if chunk.content:
                    full_resp_content += chunk.content[0].get("text")
                    yield f"data:{json.dumps(chunk.content,ensure_ascii=False)}\n\n"
                    #yield f"data: {json.dumps({'type': 'content', 'content': chunk.content}, ensure_ascii=False)}\n\n"
                    #print(f"chunk.usage_metadata:{chunk.usage_metadata}\nfull_chunk.usage_metadata:{full_chunk.usage_metadata}")
            #for循环完成表面流式输出完成，该保存到数据库了
            yield "data: [DONE]\n\n"
            message = Messages(
                conversation_id=conversation_id,
                role="assistant",
                content_json=json.dumps(
                    [
                        {#手动拼接出HumanMessage.content的格式
                            "type":"text",
                            "text":full_resp_content
                        }
                    ],
                    ensure_ascii=False
                ),
                model=model
            )
            db.session.add(message)
            db.session.commit()

        return Response(
                stream_with_context(generator()),
                mimetype="text/event-stream",
                headers={
                    "Cache-Control": "no-cache",
                    "X-Accel-Buffering": "no",
                }
                )
  
# 言いたいことがあるんだよ

# やっぱり なぎちゃん 可愛いよ

# 好き好き大好き やっぱ好き

# やっと見つけたお姫様

# 俺が生まれてきた理由

# それはお前に出会うため

# 俺と一緒に人生歩もう

# 世界で一番愛してる

# あ い し て る!