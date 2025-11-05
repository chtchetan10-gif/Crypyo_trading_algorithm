# app.py
from flask import Flask, render_template, request, redirect, url_for, session, jsonify
import json
import random
from datetime import datetime, timedelta
import pandas as pd
import numpy as np 

app = Flask(__name__)
app.secret_key = 'super_secret_key_for_ai_bot_dashboard'

@app.after_request
def add_cache_control(response):
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

# --- Configuration & Global State ---
VALID_PINS = ['260914'] 
INITIAL_BALANCE = 352.88

# --- Dynamic State Variables for Simulation ---
GLOBAL_STATE = {
    'total_signals': 131129,
    'total_trades': 85,
    'open_position_count': 0,
    'current_side': 'NONE',
    'current_size': 0.0,
    'initial_pnl_val': -15966.96,
    'pnl_history': list(np.linspace(-2000, -15966.96, 20)), 
    'pnl_dates': [(datetime.now() - timedelta(days=15) + timedelta(hours=i*2)).strftime('%b %d, %I:%M %p') for i in range(20)],
    'recent_trades': []
}

# --- Data Simulation Functions ---

def generate_ohlc_data(base_price=3.55, num_points=50):
    """Generates simulated Candlestick and Indicator data."""
    now = datetime.now()
    dates = [now - timedelta(minutes=i*30) for i in range(num_points)][::-1] 
    
    open_prices, high_prices, low_prices, close_prices, volume = [], [], [], [], []
    rsi, macd_line, signal_line, macd_hist = [], [], [], []
    ema9, ema21, sma50, bb_upper, bb_lower = [], [], [], [], []
    
    current_price = base_price + random.uniform(-0.02, 0.02)
    
    for i in range(num_points):
        open_p = current_price
        close_p = open_p + random.uniform(-0.005, 0.005) 
        high_p = max(open_p, close_p) + random.uniform(0, 0.002)
        low_p = min(open_p, close_p) - random.uniform(0, 0.002)
        
        open_prices.append(round(open_p, 4))
        close_prices.append(round(close_p, 4))
        high_prices.append(round(high_p, 4))
        low_prices.append(round(low_p, 4))
        volume.append(random.uniform(100000, 3000000))

        rsi.append(round(50 + 20 * np.sin(i / 15.0 + random.uniform(-0.1, 0.1)), 1))
        macd_line.append(random.uniform(-0.001, 0.001))
        signal_line.append(random.uniform(-0.0008, 0.0008))
        macd_hist.append(macd_line[-1] - signal_line[-1])
        ema9.append(round(close_p + random.uniform(-0.001, 0.001), 4))
        ema21.append(round(close_p + random.uniform(-0.0015, 0.0015), 4))
        sma50.append(round(close_p + random.uniform(-0.002, 0.002), 4))
        bb_upper.append(round(close_p + 0.01 + random.uniform(-0.001, 0.001), 4))
        bb_lower.append(round(close_p - 0.01 - random.uniform(-0.001, 0.001), 4))
        
        current_price = close_p

    return {
        'dates': [d.strftime('%Y-%m-%d %H:%M:%S') for d in dates],
        'open': open_prices, 'high': high_prices, 'low': low_prices, 'close': close_prices,
        'volume': volume,  'rsi': rsi, 'macd_line': macd_line, 'signal_line': signal_line, 
        'macd_hist': macd_hist, 'ema9': ema9, 'ema21': ema21, 'sma50': sma50, 
        'bb_upper': bb_upper, 'bb_lower': bb_lower,
    }, rsi[-1]

def simulate_data():
    """Simulates all the initial data points needed for the dashboard."""
    initial_pnl_val = GLOBAL_STATE['initial_pnl_val']
    current_balance = INITIAL_BALANCE + initial_pnl_val
    
    ohlc_data, current_rsi = generate_ohlc_data()
    
    now = datetime.now()
    recent_signals = []
    for i in range(10):
        t = (now - timedelta(minutes=i*2)).strftime("%b %d, %I:%M %p")
        signal_choice = random.choice(['BUY', 'SELL', 'HOLD'])
        strength = random.randint(0, 100) if signal_choice != 'HOLD' else 0
        status = 'Executed' if random.random() > 0.5 else 'Pending'
        
        recent_signals.append({
            'TIME': t, 'SIGNAL': signal_choice, 'STRENGTH': strength, 
            'PRICE': round(3.55 + random.uniform(-0.01, 0.01), 4),
            'STATUS': status
        })
    
    recent_decisions = []
    for i in range(5):
        t = (now - timedelta(minutes=i*3)).strftime("%I:%M:%S %p")
        original_signal = random.choice(['BUY', 'SELL', 'HOLD'])
        final_decision = random.choice(['BUY', 'SELL', 'HOLD'])
        confidence = round(random.uniform(0.65, 0.95), 2)
        
        recent_decisions.append({
            'TIME': t, 
            'ORIGINAL': original_signal, 
            'RL_ACTION': f'RL recommends: {final_decision}, confidence: {confidence}',
            'FINAL': final_decision, 
            'CONFIDENCE': confidence,
            'REASON': f'Confidence {confidence*100:.1f}% met threshold.' if confidence > 0.7 else 'Insufficient confidence.'
        })
        
    projection_data = {
        'scenario_label': '90-Day RL Model Projection',
        'worst_case_value': -71851.34, 
        'best_case_value': -47900.89,  
        'current_balance': current_balance     
    }
        
    return {
        'metrics': {
            'total_signals': GLOBAL_STATE['total_signals'],
            'total_trades': GLOBAL_STATE['total_trades'],
            'open_positions_count': GLOBAL_STATE['open_position_count'],
            'last_signal_time': recent_signals[-1]['TIME']
        },
        'performance': {
            'win_rate': '0.00%', 'total_pnl': f"{abs(initial_pnl_val):,.2f}",
            'avg_win': '$0.00', 'avg_loss': '-$1064.46',
            'max_loss': '-$1308.33', 'risk_reward': '1:0.00'
        },
        'trade_breakdown': {
            'total_trades': GLOBAL_STATE['total_trades'], 'winning': 0, 'losing': GLOBAL_STATE['total_trades']
        },
        'projected_balance': {
            'current': f"{current_balance:,.2f}",
            'conservative': '$0', 'realistic': '$0', 'rl_enhanced': '$0'
        },
        'risk_assessment': {
            'best_case': '-$47900.89', 'worst_case': '-$71851.34',
            'expected_range': '$-71851 - $-47901'
        },
        'cumulative_pnl_data': {
            'dates': GLOBAL_STATE['pnl_dates'],
            'pnl': [round(p, 2) for p in GLOBAL_STATE['pnl_history']]
        },
        'candlestick_data': ohlc_data, 
        'live_data': {
            'Price': ohlc_data['close'][-1], 'RSI': current_rsi, 'VWAP': 3.5915,
            'CurrentSignal': 'HOLD (0)', 'Side': GLOBAL_STATE['current_side'], 'Size': GLOBAL_STATE['current_size']
        },
        'recent_signals': recent_signals,
        'recent_decisions': recent_decisions,
        'recent_trades': GLOBAL_STATE['recent_trades'],
        'projection_data': projection_data 
    }

DASHBOARD_DATA = simulate_data()

# --- Routes ---

@app.route('/')
def home():
    if not session.get('authenticated'):
        return redirect(url_for('login'))
    return redirect(url_for('dashboard'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        pin = request.form.get('pin_code')
        if pin in VALID_PINS:
            session['authenticated'] = True
            return redirect(url_for('dashboard'))
        else:
            return render_template('login.html', error='Invalid PIN. Try 123456')
            
    return render_template('login.html')

@app.route('/dashboard')
def dashboard():
    if not session.get('authenticated'):
        return redirect(url_for('login'))
        
    return render_template('dashboard.html', data=DASHBOARD_DATA, current_user='AI Bot User')

@app.route('/logout')
def logout():
    session.pop('authenticated', None)
    return redirect(url_for('login'))

@app.route('/api/data', methods=['GET'])
def get_data():
    """API endpoint for fetching data every 10 seconds and simulating dynamic updates."""
    if not session.get('authenticated'):
        return jsonify({'error': 'Unauthorized'}), 401

    now = datetime.now()
    
    GLOBAL_STATE['total_signals'] += random.randint(1, 3)
    
    current_price = DASHBOARD_DATA['live_data']['Price']
    new_price = round(current_price + random.uniform(-0.001, -0.0005), 4)
    ohlc_data, current_rsi = generate_ohlc_data(base_price=new_price)
    
    DASHBOARD_DATA['live_data']['Price'] = new_price
    DASHBOARD_DATA['live_data']['VWAP'] = round(DASHBOARD_DATA['live_data']['VWAP'] + random.uniform(-0.0005, 0.0005), 4)
    DASHBOARD_DATA['live_data']['RSI'] = current_rsi 
    DASHBOARD_DATA['candlestick_data'] = ohlc_data
    
    current_pnl_abs = float(DASHBOARD_DATA['performance']['total_pnl'].replace(',', '').replace('$', ''))
    new_pnl_val = - (current_pnl_abs + random.uniform(5.00, 15.00)) 
    
    DASHBOARD_DATA['performance']['total_pnl'] = f"{abs(new_pnl_val):,.2f}"

    GLOBAL_STATE['pnl_history'].pop(0)
    GLOBAL_STATE['pnl_history'].append(new_pnl_val)
    GLOBAL_STATE['pnl_dates'].pop(0)
    GLOBAL_STATE['pnl_dates'].append(now.strftime('%b %d, %I:%M %p'))

    DASHBOARD_DATA['cumulative_pnl_data']['dates'] = GLOBAL_STATE['pnl_dates']
    DASHBOARD_DATA['cumulative_pnl_data']['pnl'] = [round(p, 2) for p in GLOBAL_STATE['pnl_history']]
    

    current_balance_val = INITIAL_BALANCE + new_pnl_val
    DASHBOARD_DATA['projected_balance']['current'] = f"{current_balance_val:,.2f}" 
    DASHBOARD_DATA['projection_data']['current_balance'] = current_balance_val 

    is_new_trade = False
    if random.random() < 0.2: 
        GLOBAL_STATE['total_trades'] += 1
        is_new_trade = True
        trade_side = random.choice(['LONG', 'SHORT'])
        trade_pnl = round(random.uniform(-100, 50), 2)
        trade_status = 'CLOSED' if trade_pnl > 0 else 'CLOSED (Loss)'
        
        new_trade = {
            'TIME': now.strftime("%I:%M:%S %p"), 
            'SIDE': trade_side, 
            'ENTRY': round(new_price - random.uniform(-0.002, 0.002), 4),
            'PNL': trade_pnl, 
            'STATUS': trade_status
        }
        GLOBAL_STATE['recent_trades'].insert(0, new_trade)
        GLOBAL_STATE['recent_trades'] = GLOBAL_STATE['recent_trades'][:10]
    
    DASHBOARD_DATA['recent_trades'] = GLOBAL_STATE['recent_trades']

    if random.random() < 0.1 and GLOBAL_STATE['open_position_count'] == 0:
        GLOBAL_STATE['open_position_count'] = 1
        GLOBAL_STATE['current_side'] = random.choice(['LONG', 'SHORT'])
        GLOBAL_STATE['current_size'] = round(random.uniform(50, 150), 1)
    elif random.random() < 0.05 and GLOBAL_STATE['open_position_count'] == 1:
        GLOBAL_STATE['open_position_count'] = 0
        GLOBAL_STATE['current_side'] = 'NONE'
        GLOBAL_STATE['current_size'] = 0.0

    DASHBOARD_DATA['metrics']['total_trades'] = GLOBAL_STATE['total_trades']
    DASHBOARD_DATA['trade_breakdown']['total_trades'] = GLOBAL_STATE['total_trades']
    DASHBOARD_DATA['trade_breakdown']['losing'] = GLOBAL_STATE['total_trades'] 
    DASHBOARD_DATA['metrics']['open_positions_count'] = GLOBAL_STATE['open_position_count']
    DASHBOARD_DATA['live_data']['Side'] = GLOBAL_STATE['current_side']
    DASHBOARD_DATA['live_data']['Size'] = GLOBAL_STATE['current_size']


    t_signal = now.strftime("%b %d, %I:%M %p")
    signal_choice = random.choice(['BUY', 'SELL', 'HOLD'])
    strength = random.randint(0, 100) if signal_choice != 'HOLD' else 0
    status = random.choice(['Executed', 'Pending'])
    
    new_signal = {
        'TIME': t_signal, 'SIGNAL': signal_choice, 'STRENGTH': strength, 
        'PRICE': new_price, 'STATUS': status
    }
    DASHBOARD_DATA['recent_signals'].pop(0) 
    DASHBOARD_DATA['recent_signals'].append(new_signal) 
    
    DASHBOARD_DATA['metrics']['last_signal_time'] = new_signal['TIME']


    t_decision = now.strftime("%I:%M:%S %p")
    original_signal = random.choice(['BUY', 'SELL', 'HOLD'])
    final_decision = random.choice(['BUY', 'SELL', 'HOLD'])
    confidence = round(random.uniform(0.65, 0.95), 2)
    
    new_decision = {
        'TIME': t_decision, 
        'ORIGINAL': original_signal, 
        'RL_ACTION': f'RL recommends: {final_decision}, confidence: {confidence}',
        'FINAL': final_decision, 
        'CONFIDENCE': confidence,
        'REASON': f'Confidence {confidence*100:.1f}% met threshold.' if confidence > 0.7 else 'Insufficient confidence.'
    }
    DASHBOARD_DATA['recent_decisions'].pop(0) 
    DASHBOARD_DATA['recent_decisions'].append(new_decision) 

    return jsonify(DASHBOARD_DATA)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)