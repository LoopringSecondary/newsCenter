/**
 * Copyright {C} 2018 Loorping Inc. <http://www.loopring.io>
 *
 */

///////////////////////////////////////////////////////////////////////
///////////////////////////// ERROR CODES /////////////////////////////
///////////////////////////////////////////////////////////////////////

enum ErrorCode {
    PARAMETER_ERROR          = 10001
    DATABASE_CONNECT_ERROR   = 10002
    DATABASE_QUERY_ERROR     = 10002
}

enum Currency {
    ALL_CURRENCY = 0
    BTC = 1
    ETH = 2
}

enum Category {
    INFORMATION = 0
    FLASH = 1
}

enum Language {
    CHINESE = 0
    ENGLISH = 1
}

struct NewsItem {
    1: string uuid
    2: string title
    3: string content
    4: i64    category
    5: string url
    6: string publishTime
    7: string source
    8: string author
    9: string imageUrl
    10: i64   bullIndex
    11: i64   bearIndex
    12: i64   forwardNum

}

struct NewsCollection {
    1: list<NewsItem> data
    2: i64 pageIndex
    3: i64 pageSize 
}

