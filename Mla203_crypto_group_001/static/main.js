// static/main.js
const API_URL = '/api/data';
const REFRESH_INTERVAL = 10000; // 10 seconds

// Global variables to store the Plotly figure data for efficient updates
let fullChartFigureData = null; 
let pnlFigureData = null;
let signalFigureData = null; 

document.addEventListener('DOMContentLoaded', () => {
    // Dark Mode Toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        // Check for saved dark mode preference
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            darkModeToggle.textContent = '☀️ Light Mode';
        }
        
        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
            darkModeToggle.textContent = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
            
            // Re-render charts with appropriate colors for dark mode
            if (document.getElementById('cumulative-pnl-chart')) {
                renderCandlestickChart(window.currentDashboardData || {});
                renderCumulativePnL(window.currentDashboardData || {});
                renderProjectionChart(window.currentDashboardData || {});
                renderSignalStrength(window.currentDashboardData || {});
            }
        });
    }
    
    if (document.getElementById('cumulative-pnl-chart')) {
        // Initial data fetch and render
        setTimeout(fetchDataAndRender, 100); 
        
        // Setup 10-second automatic refresh
        const intervalId = setInterval(fetchDataAndRender, REFRESH_INTERVAL);

        // Event listener for the manual refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                fetchDataAndRender();
            });
        }
    }
});


function fetchDataAndRender() {
    fetch(API_URL)
        .then(response => {
            if (!response.ok) {
                console.error('API fetch failed. Stopping refresh.');
                if (response.status === 401) {
                    window.location.href = '/login';
                }
                return;
            }
            return response.json();
        })
        .then(data => {
            if (data) {
                // Store data globally for dark mode toggle
                window.currentDashboardData = data;
                
                // Call ALL update functions on every successful API fetch
                updateDashboardMetrics(data); 
                renderCandlestickChart(data); 
                renderCumulativePnL(data); 
                renderProjectionChart(data); 
                updateTables(data); 
                renderSignalStrength(data); 
                
                // Update the Live Data "Last Update" time
                document.getElementById('last-update-time').textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            }
        })
        .catch(error => console.error('Error during data fetch:', error));
}


function updateDashboardMetrics(data) {
    // Helper to format currency
    const formatCurrency = (val) => {
        const value = parseFloat(val.toString().replace(/[^0-9.-]+/g,""));
        return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // --- 1. Top Bar Metrics (FULLY DYNAMIC) ---
    document.getElementById('total-signals').textContent = data.metrics.total_signals.toLocaleString();
    document.getElementById('total-trades').textContent = data.metrics.total_trades.toLocaleString();
    document.getElementById('open-positions-count').textContent = data.metrics.open_positions_count;
    document.getElementById('last-signal-time').textContent = data.metrics.last_signal_time;


    // --- 2. Live Market Data & Position (FULLY DYNAMIC) ---
    document.getElementById('live-price').textContent = parseFloat(data.live_data.Price).toFixed(4);
    document.getElementById('live-vwap').textContent = parseFloat(data.live_data.VWAP).toFixed(4);
    document.getElementById('live-rsi').textContent = data.live_data.RSI;
    document.getElementById('current-signal').textContent = data.live_data.CurrentSignal;
    
    const liveSideElement = document.getElementById('live-side');
    liveSideElement.textContent = data.live_data.Side;
    liveSideElement.className = data.live_data.Side === 'LONG' ? 'status-green' : (data.live_data.Side === 'SHORT' ? 'status-red' : 'status-hold');
    document.getElementById('live-size').textContent = data.live_data.Size;

    // --- 3. Performance Metrics ---
    const totalPnL = document.getElementById('total-pnl');
    const pnlValue = parseFloat(data.performance.total_pnl.replace(/[^0-9.-]+/g,"")); 
    let pnlText = `-$${formatCurrency(pnlValue)}`;
    totalPnL.textContent = pnlText;
    totalPnL.classList.add('data-loss'); 

    document.getElementById('win-rate').textContent = data.performance.win_rate;
    document.getElementById('avg-win').textContent = data.performance.avg_win;
    document.getElementById('avg-loss').textContent = data.performance.avg_loss;
    document.getElementById('risk-reward').textContent = data.performance.risk_reward;

    // --- 4. Projected Balance & Trade Breakdown ---
    document.getElementById('current-balance').textContent = `$${formatCurrency(data.projected_balance.current)}`;
    document.getElementById('total-trades-breakdown').textContent = data.trade_breakdown.total_trades;
    document.getElementById('losing-trades').textContent = data.trade_breakdown.losing;
    
    // --- 5. Risk Assessment 
    document.getElementById('risk-best').textContent = data.risk_assessment.best_case;
}


function renderCandlestickChart(data) {
    const chartDiv = 'candlestick-chart';
    const ohlcData = data.candlestick_data;
    const dates = ohlcData.dates;
    
    // Detect dark mode
    const isDarkMode = document.body.classList.contains('dark-mode');
    const bgColor = isDarkMode ? '#2d2d2d' : '#FFFFFF';
    const gridColor = isDarkMode ? '#444' : '#f0f0f0';
    const textColor = isDarkMode ? '#e0e0e0' : '#000';
    
    const traces = [];

    // Candlestick (y1)
    traces.push({
        x: dates, open: ohlcData.open, high: ohlcData.high, low: ohlcData.low, close: ohlcData.close,
        type: 'candlestick', name: 'Price', xaxis: 'x', yaxis: 'y1',
        increasing: { line: { color: '#2ecc71' }, fillcolor: '#2ecc71' }, 
        decreasing: { line: { color: '#e74c3c' }, fillcolor: '#e74c3c' } 
    });

    // MAs (y1)
    traces.push({ x: dates, y: ohlcData.ema9, type: 'scatter', mode: 'lines', name: 'EMA 9', xaxis: 'x', yaxis: 'y1', line: { color: 'orange', width: 1 } });
    traces.push({ x: dates, y: ohlcData.ema21, type: 'scatter', mode: 'lines', name: 'EMA 21', xaxis: 'x', yaxis: 'y1', line: { color: 'blue', width: 1 } });
    traces.push({ x: dates, y: ohlcData.sma50, type: 'scatter', mode: 'lines', name: 'SMA 50', xaxis: 'x', yaxis: 'y1', line: { color: 'red', width: 1 } });

    // Bollinger Bands (y1)
    traces.push({ x: dates, y: ohlcData.bb_upper, type: 'scatter', mode: 'lines', name: 'BB Upper', xaxis: 'x', yaxis: 'y1', line: { color: 'gray', width: 1, dash: 'dash' }, showlegend: false });
    traces.push({ x: dates, y: ohlcData.bb_lower, type: 'scatter', mode: 'lines', name: 'BB Lower', xaxis: 'x', yaxis: 'y1', line: { color: 'gray', width: 1, dash: 'dash' }, showlegend: false });

    // Volume Bars (y2)
    traces.push({
        x: dates, y: ohlcData.volume, type: 'bar', name: 'Volume', xaxis: 'x', yaxis: 'y2', 
        marker: {
            color: ohlcData.close.map((c, i) => c > ohlcData.open[i] ? '#2ecc71' : '#e74c3c'),
            opacity: 0.6
        }
    });

    // MACD (y3)
    traces.push({ x: dates, y: ohlcData.macd_hist, type: 'bar', name: 'MACD Hist', xaxis: 'x', yaxis: 'y3', marker: { color: 'lightgray' } });
    traces.push({ x: dates, y: ohlcData.macd_line, type: 'scatter', mode: 'lines', name: 'MACD', xaxis: 'x', yaxis: 'y3', line: { color: 'blue', width: 1 } });
    traces.push({ x: dates, y: ohlcData.signal_line, type: 'scatter', mode: 'lines', name: 'Signal', xaxis: 'x', yaxis: 'y3', line: { color: 'red', width: 1 } });

    // RSI (y4)
    traces.push({ x: dates, y: ohlcData.rsi, type: 'scatter', mode: 'lines', name: 'RSI', xaxis: 'x', yaxis: 'y4', line: { color: '#9b59b6', width: 1 } });
    
    const layout = {
        height: 800, title: { text: 'SUI/USDC Chart Analysis (15 Min)', font: { size: 14, color: textColor } },
        margin: { t: 40, r: 10, b: 60, l: 60 }, plot_bgcolor: bgColor, paper_bgcolor: bgColor, showlegend: true,
        grid: {
            rows: 4, columns: 1, pattern: 'independent', roworder: 'top to bottom',
            rowheights: [0.55, 0.15, 0.15, 0.15] 
        },
        yaxis: { domain: [0.45, 1.0], title: 'Price', autorange: true, tickformat: '.4f', showgrid: true, gridcolor: gridColor, color: textColor },
        yaxis2: { domain: [0.30, 0.45], title: 'Volume', autorange: true, showticklabels: false, showgrid: false, color: textColor },
        yaxis3: { domain: [0.15, 0.30], title: 'MACD', autorange: true, showticklabels: false, showgrid: true, gridcolor: gridColor, color: textColor },
        yaxis4: { domain: [0.0, 0.15], title: 'RSI', autorange: true, showgrid: true, gridcolor: gridColor, color: textColor },
        xaxis: { anchor: 'y4', type: 'date', rangeslider: { visible: false }, showgrid: false, color: textColor },
        font: { color: textColor }
    };

    if (!fullChartFigureData) {
        fullChartFigureData = traces;
        Plotly.newPlot(chartDiv, fullChartFigureData, layout, {responsive: true, displayModeBar: false});
    } else {
        Plotly.react(chartDiv, { data: traces, layout: layout }); 
    }
}


function renderCumulativePnL(data) {
    const chartDiv = 'cumulative-pnl-chart';
    
    // Detect dark mode
    const isDarkMode = document.body.classList.contains('dark-mode');
    const bgColor = isDarkMode ? '#2d2d2d' : '#FFFFFF';
    const gridColor = isDarkMode ? '#444' : '#f0f0f0';
    const textColor = isDarkMode ? '#e0e0e0' : '#000';

    const trace = {
        x: data.cumulative_pnl_data.dates,
        y: data.cumulative_pnl_data.pnl,
        mode: 'lines+markers',
        line: { color: '#3498db', width: 2 },
        marker: { size: 4, color: '#3498db' },
        name: 'Cumulative PnL',
        hoverinfo: 'x+y'
    };

    const layout = {
        title: { text: 'Cumulative PnL Over Time', font: { size: 14, color: textColor } },
        margin: { t: 40, r: 10, b: 60, l: 60 },
        xaxis: { showgrid: false, tickangle: -45, tickfont: { size: 10 }, color: textColor },
        yaxis: { title: 'PnL ($)', tickformat: '$,.2f', showgrid: true, gridcolor: gridColor, color: textColor },
        plot_bgcolor: bgColor, paper_bgcolor: bgColor, showlegend: false,
        font: { color: textColor }
    };

    if (!pnlFigureData) {
        pnlFigureData = [trace];
        Plotly.newPlot(chartDiv, pnlFigureData, layout, {responsive: true, displayModeBar: false});
    } else {
        // Use Plotly.restyle to update the data arrays
        Plotly.restyle(chartDiv, 'x', [data.cumulative_pnl_data.dates], 0);
        Plotly.restyle(chartDiv, 'y', [data.cumulative_pnl_data.pnl], 0);
    }
}


function renderSignalStrength(data) {
    const chartDiv = 'signal-strength-chart';
    const currentRSI = data.live_data.RSI;
    
    // Detect dark mode
    const isDarkMode = document.body.classList.contains('dark-mode');
    const bgColor = isDarkMode ? '#2d2d2d' : '#FFFFFF';
    const textColor = isDarkMode ? '#e0e0e0' : '#000';

    // Simulate signal distribution based on RSI
    let strongBuy = 0, buy = 0, hold = 0, sell = 0, strongSell = 0;

    if (currentRSI < 30) {
        strongBuy = Math.floor(60 + Math.random() * 10);
        buy = Math.floor(20 + Math.random() * 5);
        sell = Math.floor(5 + Math.random() * 5);
        hold = 100 - strongBuy - buy - sell;
    } else if (currentRSI > 70) {
        strongSell = Math.floor(60 + Math.random() * 10);
        sell = Math.floor(20 + Math.random() * 5);
        buy = Math.floor(5 + Math.random() * 5);
        hold = 100 - strongSell - sell - buy;
    } else {
        hold = Math.floor(50 + Math.random() * 20);
        buy = Math.floor(10 + Math.random() * 10);
        sell = Math.floor(10 + Math.random() * 10);
        strongBuy = 100 - hold - buy - sell - Math.floor(5 + Math.random() * 5);
        strongSell = 100 - hold - buy - sell - strongBuy;
        strongBuy = Math.max(0, strongBuy);
        strongSell = Math.max(0, strongSell);
        const sum = strongBuy + buy + hold + sell + strongSell;
        hold += (100 - sum); 
    }

    const signalData = [
        { name: 'Strong Buy', value: strongBuy }, 
        { name: 'Buy', value: buy }, 
        { name: 'Hold', value: hold }, 
        { name: 'Sell', value: sell }, 
        { name: 'Strong Sell', value: strongSell }
    ];

    const trace = {
        x: signalData.map(d => d.name),
        y: signalData.map(d => d.value),
        type: 'bar',
        marker: { color: ['#2ecc71', '#5cb85c', '#f39c12', '#e74c3c', '#c0392b'] },
        hovertemplate: '%{y:.0f}<extra></extra>' 
    };

    const layout = {
        title: { text: `Signal Distribution (RSI: ${currentRSI.toFixed(1)})`, font: { size: 14, color: textColor } },
        margin: { t: 40, r: 10, b: 40, l: 40 },
        xaxis: { title: 'Signal Type', showgrid: false, color: textColor },
        yaxis: { title: 'Count (%)', range: [0, 100], color: textColor },
        plot_bgcolor: bgColor, paper_bgcolor: bgColor, showlegend: false,
        font: { color: textColor }
    };

    if (!signalFigureData) {
        signalFigureData = [trace];
        Plotly.newPlot(chartDiv, signalFigureData, layout, {responsive: true, displayModeBar: false});
    } else {
        Plotly.restyle(chartDiv, 'y', [signalData.map(d => d.value)], 0);
        Plotly.relayout(chartDiv, { 'title.text': layout.title.text });
    }
}


function renderProjectionChart(data) {
    const chartDiv = 'projection-chart';
    const projData = data.projection_data;
    
    // Detect dark mode
    const isDarkMode = document.body.classList.contains('dark-mode');
    const bgColor = isDarkMode ? '#2d2d2d' : '#FFFFFF';
    const gridColor = isDarkMode ? '#444' : '#f0f0f0';
    const textColor = isDarkMode ? '#e0e0e0' : '#000';
    
    const rangeValue = projData.best_case_value - projData.worst_case_value;
    const offset = projData.worst_case_value;
    const markerPosition = projData.current_balance;

    const barTrace = {
        x: [rangeValue],
        y: [projData.scenario_label],
        base: [offset], 
        type: 'bar',
        orientation: 'h',
        name: 'Expected Range',
        showlegend: false,
        marker: { color: 'rgba(52, 152, 219, 0.5)', line: { color: 'rgba(0,0,0,0)' } },
        hovertemplate: `Range: $%{base:,.2f} to $%{x+base:,.2f}<extra></extra>`
    };

    const layout = {
        height: 100, 
        margin: { t: 20, r: 10, b: 20, l: 140 },
        plot_bgcolor: bgColor, paper_bgcolor: bgColor, showlegend: false,
        
        xaxis: {
            title: 'PnL ($)', showgrid: true, tickformat: '$,.0f', gridcolor: gridColor,
            zeroline: true, zerolinecolor: 'gray', color: textColor
        },
        yaxis: { showgrid: false, autorange: 'reversed', color: textColor },
        font: { color: textColor },
        
        shapes: [
            {
                type: 'line', xref: 'x', yref: 'paper', 
                x0: markerPosition, y0: 0, x1: markerPosition, y1: 1,
                line: { color: '#e74c3c', width: 3, dash: 'solid' }
            }
        ],
        
        annotations: [
            {
                xref: 'x', yref: 'paper', x: markerPosition, y: 1.15,
                text: `Current Balance: $${markerPosition.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                showarrow: false, font: { color: '#3498db', size: 10, weight: 'bold' }, xanchor: 'center'
            }
        ]
    };

    Plotly.react(chartDiv, [barTrace], layout, {responsive: true, displayModeBar: false});
}


function updateTables(data) {
    // Helper function to render the table rows and apply colors
    function createTableRow(rowData, tableId) {
        let row = `<tr>`;
        const keys = Object.keys(rowData);
        
        keys.forEach(key => {
            let value = rowData[key];
            let cellClass = '';
            
            if (tableId === 'recent-signals-table') {
                if (key === 'STATUS' && value === 'Pending') cellClass = 'status-pending';
                if (key === 'STATUS' && value === 'Executed') cellClass = 'status-executed';
                if (key === 'SIGNAL') {
                    if (value === 'BUY') cellClass = 'status-green';
                    if (value === 'SELL') cellClass = 'status-red';
                    if (value === 'HOLD') cellClass = 'status-hold';
                }
            } else if (tableId === 'recent-decisions-table') {
                if (key === 'FINAL' || key === 'ORIGINAL') {
                    if (value === 'BUY') cellClass = 'status-green';
                    if (value === 'SELL') cellClass = 'status-red';
                    if (value === 'HOLD') cellClass = 'status-hold';
                }
                if (key === 'CONFIDENCE') {
                    value = value.toFixed(2);
                }
            } else if (tableId === 'recent-trades-table') { 
                if (key === 'SIDE') {
                    if (value === 'LONG') cellClass = 'status-green';
                    if (value === 'SHORT') cellClass = 'status-red';
                }
                if (key === 'PNL') {
                    value = parseFloat(value).toFixed(2);
                    if (parseFloat(value) >= 0) cellClass = 'status-green';
                    if (parseFloat(value) < 0) cellClass = 'status-red';
                }
            }
            
            row += `<td class="${cellClass}">${value}</td>`;
        });
        row += `</tr>`;
        return row;
    }

    // Recent Signals Table
    const signalBody = document.querySelector('#recent-signals-table tbody');
    signalBody.innerHTML = '';
    data.recent_signals.forEach(signal => {
        signalBody.innerHTML += createTableRow(signal, 'recent-signals-table');
    });

    // Recent RL Decisions Table
    const decisionBody = document.querySelector('#recent-decisions-table tbody');
    decisionBody.innerHTML = '';
    data.recent_decisions.forEach(decision => {
        decisionBody.innerHTML += createTableRow(decision, 'recent-decisions-table');
    });

    // Recent Trades Table (NOW DYNAMIC)
    const tradeBody = document.querySelector('#recent-trades-table tbody');
    tradeBody.innerHTML = '';
    if (data.recent_trades && data.recent_trades.length > 0) {
        data.recent_trades.forEach(trade => {
            tradeBody.innerHTML += createTableRow(trade, 'recent-trades-table');
        });
    } else {
        tradeBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No trades found</td></tr>';
    }
}