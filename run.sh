#!/bin/sh
#
# Copyright 2018 Loopring All Rights Reserved.
# Author: autumn84

thrift --gen js:node -o ./ proto/data.thrift

nohup node ./src/loopring/news/newsServer.js &
