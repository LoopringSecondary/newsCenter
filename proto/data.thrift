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
    1: string title
    2: string content
    3: i64    category
    4: string url
    5: string publishTime
    6: string source
    7: string author
    8: string imageUrl
}

struct NewsCollection {
    1: list<NewsItem> data
    2: i64 pageIndex
    3: i64 pageSize 
}

