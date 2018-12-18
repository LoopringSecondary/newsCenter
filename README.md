# newsCenter

## 环境准备
* nodejs+mysql
* 项目根目录下执行```sh prepare.sh```

## 启动
```sh run.sh```

## 接口示例
```
curl 127.0.0.1:3000 -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"query",currency:"LRC",category:"information",pageIndex":0,"pageSize":5,"language":"cn"},"id":64}'
```
Normal respose
```
{
"jsonrpc":"2.0",
"id":64,
"result":
    {"data":
        [
            {"title":"文章2",
            "content":"文章2正文",
            "currency":"LRC",
            "category":"information"
            “url”:"",
            "publishTime":"",
            "source":"",
            "author":"",
            "imageUrl":"" }
        ],
    "pageIndex":0,
    "pageSize":5
    }
}
```
Abnormal response
```
{"jsonrpc":"2.0","id":64,"error":{"code":-32603,"message":"Internal error"}}
```
