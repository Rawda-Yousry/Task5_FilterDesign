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
current_allPassAngle = np.zeros(512)
phaseCorectionResponse = np.zeros(512)
deleted_angles_allPass = np.zeros(512)
deleted_anglesallPass = np.zeros(512)
w_allPass = []

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
        complexNumbers[i] = x + y*1j
    return complexNumbers


def filter():
    global zeros, poles
    zeros = complexNumbers(zerosArray)
    poles = complexNumbers(polesArray)

    global w
    w, h = signal.freqz_zpk(zeros, poles, k=1, fs = 2 * np.pi)   # Calculate the frequency reponse using the Design Equation form

    global magnitude
    magnitude = 20 * np.log10(np.abs(h))
    global angles
    angles = np.unwrap(np.angle(h))
    return " "

def get_a(coeff):
    x = coeff[0]
    y = coeff[1]
    a =  x + y*1j
    return a

def allPassFilterCalculate(coeff):
    a = get_a(coeff)
    w, h = signal.freqz([-a,1], [1, -a])    # Calculate the frequency reponse using the Implementation Equation form 
    angle = np.unwrap(np.angle(h))
    return angle

def allPassFilter():
    global current_allPassAngle, angles_allPass
    current_allPassAngle = allPassFilterCalculate(allPassCoeff)
    if applyAllPassFlag == True:
        angles_allPass +=  current_allPassAngle

    filter_send()
    return ""

def deleteAllpassFilter():
    global deleted_anglesallPass, angles_allPass
    _, deleted_anglesallPass = allPassFilterCalculate(deletedAllpassCoeff)
    if deleteFlag == True:
        angles_allPass -= deleted_anglesallPass

    filter_send()
    return ""


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/filter_send",methods=["post"])
def filter_send():
    filter()
    global w, magnitude, angles, angles_allPass, current_allPassAngle, phaseCorectionResponse

    if np.array_equal(phaseCorectionResponse, angles):
        pass
    else:
        phaseCorectionResponse = angles.copy() + angles_allPass

    phaseCorectionResponse += current_allPassAngle

    if applyAllPassFlag == True or deleteFlag == True:
        angles = angles + angles_allPass
        phaseCorectionResponse = angles.copy()
    
    if len(zerosArray) == 0 and len(polesArray) == 0:
        angles = np.zeros(512)
        # phaseCorectionResponse = angles.copy()
 
    params = {
    "magnitudeX": w.tolist(),
    "magnitudeY": magnitude.tolist(),
    "angles": angles.tolist(),
    "angles_allPass": current_allPassAngle.tolist(),
    "phaseResponse": phaseCorectionResponse.tolist(),
    }
    return jsonify(params)


@app.route('/differenceEquationCoefficients' , methods=['GET','POST'])
def applying_filter():
    global filteredSignal
    b, a = signal.zpk2tf(zeros, poles, 1)    # Transfer function coefficients
    inputSignal = request.get_json()
    filteredSignal = signal.lfilter(b,a,inputSignal)  # Filter the input signal using Diffrence equation Y[n] = Σ b[m].X[n-m] - Σ a[m].Y[n-m] 
    return jsonify(filteredSignal.real.tolist())       # and Transfer function


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
        filter_send()
        data = {
                "zerosArray": zerosArray,
                "polesArray": polesArray
        }
    return jsonify(data)


@app.route('/importSignal' , methods=['POST'])
def importSignal():
    if request.method =="POST":
        fileName = request.files['fileSignal']
        if fileName:
            file = fileName.read()
            df = pd.read_csv(io.StringIO(file.decode('utf-8')))
            b,a = signal.zpk2tf(zeros, poles, 1) 
            new_signal = signal.lfilter(b,a,df['y'])
            data = {
                'x': df['x'].tolist(),
                'y': df['y'].tolist(),
                'y_new': new_signal.real.tolist(),
                'length': len(df["y"])
                }
    return jsonify(data)


@app.route("/initiate",methods=["post"])
def initiate():
    global zeros,zerosArray,poles,polesArray, w, angles, angles_allPass, current_allPassAngle
    zerosArray = []
    poles=[]
    zeros=[]
    polesArray=[]
    angles_allPass = np.zeros(512)
    current_allPassAngle = np.zeros(512)
    angles =[]
    return " "


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
    return '  '


@app.route("/deletedAllpassCoeff", methods = ["POST"])
def deletedAllpassCoeff():
    global deletedAllpassCoeff, deleteFlag, applyAllPassFlag
    data = request.get_json() 
    deletedAllpassCoeff = [float(data['x']), float(data['y'])] 
    deleteFlag = data['delete']
    applyAllPassFlag = data['flag']
     
    deleteAllpassFilter()
    return '  '


if __name__ == '__main__':
	app.run(debug=True)
