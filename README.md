# newsCenter

## 环境准备
* nodejs+mysql
* 项目根目录下执行```sh prepare.sh```

## 启动
```sh run.sh```

## 接口示例

### query news
```
curl localhost:5555 -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"queryNews","params":[{"currency":"LRC","language":"zh-Hans","category":"information","pageIndex":0,"pageSize":1}],"id":64}'
```
Normal respose
```
{
"jsonrpc":"2.0",
"id":64,
"result":
    {"data":
        [
            {
            "uuid":"FceDsvh7gpfCmyS2IYN2D0kHfcU="
            "title":"文章2",
            "content":"文章2正文",
            "currency":"LRC",
            "category":0
            “url”:"",
            "publishTime":"",
            "source":"",
            "author":"",
            "imageUrl":"",
            "bullIndex":4,
            "bearIndex":0,
            "forwardNum":0}
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

### update index
```
curl localhost:5555 -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"updateIndex","params":{"uuid":"FceDsvh7gpfCmyS2IYN2D0kHfcU","indexName":"bull_index", "direction":1},"id":64}'
```
Normal response
```
{
"jsonrpc":"2.0",
"id":64,
"result":{
    "uuid":"FceDsvh7gpfCmyS2IYN2D0kHfcU",
    "bullIndex":4,
    "bearIndex":0,
    "forwardNum":0
    }
}
```
Abnormal response
```
{"jsonrpc":"2.0","id":64,"error":{"code":-32603,"message":"Internal error"}}
```
