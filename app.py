from flask import Flask, render_template, request, redirect, url_for, jsonify
import pandas as pd
import json
import plotly
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np
from scipy import signal
import csv
import scipy
import io

app = Flask(__name__)

poles = []
zeros = []
polesArray = []
zerosArray = []

w = []
magnitude = []
angles = []
filteredSignal = []
allPassCoeff = [0,0]
deletedAllpassCoeff = [0,0]
angles_allPass = np.zeros(512)
anglesallPass = np.zeros(512)
deleted_angles_allPass = np.zeros(512)
deleted_anglesallPass = np.zeros(512)
w_allPass = []
deleted_w_allPass = []

applyAllPassFlag = False
deleteFlag = False
    
def normalization(arr):
    for i in arr:
        i['x'] = (i['x'] - 150) / 120
        i['y'] = (150 - i['y']) / 120
    arr = [[d['x'], d['y']] for d in arr]
    return arr

def complexNumbers(array):
    complexNumbers = [0]*len(array)
    for i in range(len(array)):
        x = round(array[i][0], 2)
        y = round(array[i][1], 2)
        complexNumbers[i] = x+ y*1j
    return complexNumbers


def filter():
    # print("zerosfilter",zerosArray)
    global zeros,poles
    zeros = complexNumbers(zerosArray)
    poles = complexNumbers(polesArray)

    global w
    w, h = signal.freqz_zpk(zeros, poles, k=1, fs =2* np.pi)

    global magnitude
    magnitude = 20 * np.log10(np.abs(h))
    global angles
    angles = np.unwrap(np.angle(h))
    return " "

def get_a(coeff):
    x = np.zeros(512)
    y = np.zeros(512)

    x = coeff[0]
    y = coeff[1]

    a =  x + y*1j
    return a

def allPassFilter():
    a = get_a(allPassCoeff)

    global w_allPass, anglesallPass, angles_allPass
    w_allPass, h_allPass = signal.freqz([-a,1], [1, -a])
    anglesallPass = np.unwrap(np.angle(h_allPass))
    if applyAllPassFlag == True:
        angles_allPass +=  anglesallPass

    filter_send()
    return ""

def deleteAllpassFilter():
    a = get_a(deletedAllpassCoeff)
    print(a)

    global deleted_w_allPass, deleted_anglesallPass, angles_allPass
    deleted_w_allPass, h_allPass = signal.freqz([-a,1], [1, -a])
    deleted_anglesallPass = np.unwrap(np.angle(h_allPass))
    print('b',angles_allPass[300])
    print('bd',deleted_anglesallPass[300])
    if deleteFlag == True:
        angles_allPass -= deleted_anglesallPass
    print('a',angles_allPass[300])

    filter_send()
    return ""

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/filter_send",methods=["post"])
def filter_send():
    filter()

    global w, magnitude, angles, angles_allPass, anglesallPass
    if applyAllPassFlag == True:
        angles = angles + angles_allPass

    if deleteFlag == True:
        angles = angles + angles_allPass

    if type(w) is not list:
        w = w.tolist()
    else:
        pass

    if type(magnitude) is not list:
        magnitude = magnitude.tolist()
    else:
        pass

    if type(angles) is not list:
        angles = angles.tolist()
    else:
        pass

    if type(anglesallPass) is not list:
        anglesallPass = anglesallPass.tolist()
    else:
        pass
    
    params = {
    "magnitudeX": w,
    "magnitudeY": magnitude,
    "angles": angles,
    "angles_allPass": anglesallPass,
    }
    return jsonify(params)


@app.route("/getPoles", methods = ["post"])
def getPoles():
    global poles
    poles = request.get_json()
    global polesArray
    polesArray = normalization(poles)           
    filter_send()
    return '  '

@app.route("/getZeros", methods = ["POST"])
def getZeros():
    global zeros
    zeros = request.get_json()
    global zerosArray
    zerosArray = normalization(zeros)           
    filter_send()
    return '  '


@app.route("/allPassCoeff", methods = ["POST"])
def allPassCoeff():
    global allPassCoeff,applyAllPassFlag, deleteFlag
    data = request.get_json() 
    allPassCoeff = [float(data['x']), float(data['y'])] 
    applyAllPassFlag = data['flag']
    deleteFlag = data['delete']
     
    allPassFilter()
    # filter_send()
    return '  '

@app.route("/deletedAllpassCoeff", methods = ["POST"])
def deletedAllpassCoeff():
    global deletedAllpassCoeff, deleteFlag, applyAllPassFlag
    data = request.get_json() 
    deletedAllpassCoeff = [float(data['x']), float(data['y'])] 
    deleteFlag = data['delete']
    applyAllPassFlag = data['flag']
     
    deleteAllpassFilter()
    # print(deletedAllpassCoeff)
    # filter_send()
    return '  '


@app.route("/exportFilter", methods = ["POST"])
def exportFilter():
    fileName = request.form["file_name"] + ".csv"
    with open(fileName, mode='w', newline='') as file:
        writer = csv.writer(file)
        for row in zerosArray:
            row.append("z")
            writer.writerow(row)
        for row in polesArray:
            row.append("p")
            writer.writerow(row)
    return" "

@app.route("/importFilter", methods = ["POST"])
def importFilter():
    fileName = request.files['file']
    if fileName:
        global zerosArray,polesArray
        zerosArray=[]
        polesArray=[]
        file_data = fileName.read().decode("utf-8")
        lines = file_data.split("\n")
        for line in lines:
            columns = line.split(",")
            if len(columns) > 2:
                string = columns[2]
                columns[0]=float(columns[0])
                columns[1]=float(columns[1])
                if string[0] == 'z' :
                    zerosArray.append([columns[0],columns[1]])
                elif string[0] == 'p':
                    polesArray.append([columns[0],columns[1]])
                # print(columns[2])
        filter_send()
        data = {
                "zerosArray": zerosArray,
                "polesArray": polesArray
        }
    return jsonify(data)
    
@app.route("/initiate",methods=["post"])
def initiate():
    global zeros,zerosArray,poles,polesArray, w, angles, angles_allPass, anglesallPass
    zerosArray = []
    poles=[]
    zeros=[]
    polesArray=[]
    angles_allPass = np.zeros(512)
    anglesallPass = np.zeros(512)
    angles =[]
    return " "


@app.route('/differenceEquationCoefficients' , methods=['GET','POST'])
def applying_filter():
        # transfet function coefficients
    global filteredSignal
    b,a = scipy.signal.zpk2tf(zeros, poles, 1) 
    inputSignal = request.get_json()
    filteredSignal = scipy.signal.lfilter(b,a,inputSignal)
    return jsonify(filteredSignal.real.tolist())

@app.route('/importSignal' , methods=['POST'])
def importSignal():
    if request.method =="POST":
        fileName = request.files['fileSignal']
        if fileName:
            # global filteredSignal
            # value = request.files.get('imported-signal')
            # print(value.filename)
            file = fileName.read()
            df = pd.read_csv(io.StringIO(file.decode('utf-8')))
            # print(importedsig['x'])
            # new_signal = applying_filter(df['y'])
            b,a = scipy.signal.zpk2tf(zeros, poles, 1) 
            # inputSignal = request.get_json()
            new_signal = scipy.signal.lfilter(b,a,df['y'])
            data = {'x':df['x'].tolist(),'y':df['y'].tolist(),'y_new':new_signal.real.tolist(),'length':len(df["y"])}
    return jsonify(data)

if __name__ == '__main__':
	app.run(debug=True)
