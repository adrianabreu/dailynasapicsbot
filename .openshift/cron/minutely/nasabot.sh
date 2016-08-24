#!/bin/bash

if [ `date +%H:%M` == "06:00" ]
then
    node $OPENSHIFT_REPO_DIR/app.js
fi
