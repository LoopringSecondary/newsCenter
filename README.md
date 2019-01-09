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
**注**：currency选择ALL_CURRENCY代表查询全部币种；其余具体币种一般推荐使用对应的大写缩写名称，如LRC。  

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
            "abstract":"摘要",
            "content":"文章2正文",
            "currency":"LRC",
            "category":"information"
            “url”:"",
            "publishTime":"",
            "source":"",
            "author":"",
            "imageUrl":"",
            "bullIndex":4,
            "bearIndex":0,
            "forwardNum":0,
            "readNum":0}
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
curl localhost:5555 -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"updateIndex","params":[{"uuid":"FceDsvh7gpfCmyS2IYN2D0kHfcU","indexName":"bull_index", "direction":1}],"id":64}'
```
**注**：目前可以更新的项目有四个，分别是：bull_index,bear_index,forward_num以及read_num;  
Normal response
```
{
"jsonrpc":"2.0",
"id":64,
"result":{
    "uuid":"FceDsvh7gpfCmyS2IYN2D0kHfcU",
    "bullIndex":4,
    "bearIndex":0,
    "forwardNum":0,
    "readNum":0
    }
}
```
Abnormal response
```
{"jsonrpc":"2.0","id":64,"error":{"code":-32603,"message":"Internal error"}}
```

### query scrolling information
```
curl localhost:5555 -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"queryScrollingInfo","params":[],"id":64}'
```
Normal response
```
{
"jsonrpc":"2.0",
"id":64,
"result":
    {"data":
        [
            {
            "uuid":""
            "title":"路印协议携手普华永道支持香港区块链加速器Loopnest",
            "abstract":"",
            "content":"",
            "currency":"",
            "category":"",
            “url”:"https://blogs.loopring.org/loopring-loopnest/",
            "publishTime":"",
            "source":"",
            "author":"",
            "imageUrl":"https://blogs.loopring.org/content/images/2018/11/loo.jpeg",
            "bullIndex":0,
            "bearIndex":0,
            "forwardNum":0}
        ]
    }
}
```
Abnormal response
```
{"jsonrpc":"2.0","id":64,"error":{"code":-32603,"message":"Internal error"}}
```
