# newsCenter

## 环境准备
* nodejs+mysql
* 项目根目录下执行```sh prepare.sh```

## 启动
```sh run.sh```

## 接口示例
```
curl 127.0.0.1:3000 -X POST -H "Content-Type: application/json" --data '{"jsonrpc":"2.0","method":"quer":"ALL","pageIndex":0,"pageSize":5},"id":64}'
```
Respose
```
{
"jsonrpc":"2.0",
"id":64,
"result":
    {"data":
        [
            {"title":"文章1","content":"文章1正文","category":"ALL"},
            {"title":"文章2","content":"文章2正文","category":"ALL"}
        ],
    "pageIndex":0,
    "pageSize":5
    }
}
```
