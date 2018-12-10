#!/bin/sh
#
# Copyright 2018 Loopring All Rights Reserved.
# Author: autumn84
ps -ef | grep "newsServer.js" | grep -v "grep" | awk '{print $2}' | xargs kill
