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
angles_allPass = np.zeros(512)
w_allPass = []

    
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


def allPassFilter():
    x = np.zeros(512)
    y = np.zeros(512)

    x = allPassCoeff[0]
    y = allPassCoeff[1]

    a =  x + y*1j

    global w_allPass, angles_allPass
    w_allPass, h_allPass = signal.freqz([-a,1], [1, -a])
    anglesallPass = np.unwrap(np.angle(h_allPass))
    angles_allPass +=  anglesallPass

    filter_send()
    return ""

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/filter_send",methods=["post"])
def filter_send():
    filter()

    global w, magnitude, angles, angles_allPass
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

    if type(angles_allPass) is not list:
        angles_allPass = angles_allPass.tolist()
    else:
        pass
    
    params = {
    "magnitudeX": w,
    "magnitudeY": magnitude,
    "angles": angles,
    "angles_allPass": angles_allPass,
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
    global allPassCoeff
    data = request.get_json() 
    allPassCoeff = [float(data['x']), float(data['y'])]  
    allPassFilter()
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
    global zeros,zerosArray,poles,polesArray, w, angles, angles_allPass
    zerosArray = []
    poles=[]
    zeros=[]
    polesArray=[]
    angles_allPass = np.zeros(512)
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


if __name__ == '__main__':
	app.run(debug=True)
