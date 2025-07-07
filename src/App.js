import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
// PapaParse will be loaded from a CDN, so the static import is removed.
// import Papa from 'papaparse'; 
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { ArrowUp, ArrowDown, TrendingUp, DollarSign, Users, ShoppingCart, Briefcase, Clock, Target, Activity, ShieldCheck, FileText, BarChart2 } from 'lucide-react';

// --- UTILITY: KPI CALCULATION LOGIC ---
// This keeps our business logic separate from our UI components.

const kpiCalculations = {
  // Helper function to safely find and parse financial values from data
  getValue: (data, key, period = 'current') => {
    const row = data.find(r => r['Metric']?.toLowerCase().trim() === key.toLowerCase());
    const value = row ? parseFloat(row[period]?.replace(/[^0-9.-]+/g, "")) : 0;
    return isNaN(value) ? 0 : value;
  },

  // --- Renamed and Enhanced for Venture-Backed Startups ---
  startup: (data, inputs) => {
    const revenue = kpiCalculations.getValue(data, 'Total Revenue');
    const prevRevenue = kpiCalculations.getValue(data, 'Total Revenue', 'previous');
    const cogs = kpiCalculations.getValue(data, 'Cost of Goods Sold (COGS)');
    const marketingCost = kpiCalculations.getValue(data, 'Marketing Expenses');
    const salesCost = kpiCalculations.getValue(data, 'Sales Expenses');
    const netIncome = kpiCalculations.getValue(data, 'Net Income');
    
    const mrr = revenue / 12;
    const prevMrr = prevRevenue / 12;
    const arr = revenue;
    
    const grossProfitMargin = (revenue > 0) ? ((revenue - cogs) / revenue) * 100 : 0;
    const netProfitMargin = (revenue > 0) ? (netIncome / revenue) * 100 : 0;
    
    const { newCustomers, churnedCustomers, totalCustomersStart, avgMonthlyBurn } = inputs;
    const totalCustomersEnd = (totalCustomersStart || 0) + (newCustomers || 0) - (churnedCustomers || 0);
    
    const customerChurnRate = (totalCustomersStart > 0) ? (churnedCustomers / totalCustomersStart) * 100 : 0;
    const cac = (newCustomers > 0) ? (marketingCost + salesCost) / newCustomers : 0;
    const avgCustomers = (totalCustomersStart + totalCustomersEnd) / 2;
    const avgRevenuePerCustomer = (avgCustomers > 0) ? mrr / avgCustomers : 0;
    const ltv = (customerChurnRate > 0) ? (avgRevenuePerCustomer / (customerChurnRate / 100)) : 0;
    const ltvToCac = (cac > 0) ? ltv / cac : 0;

    const growthRate = (prevRevenue > 0) ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;
    const ruleOf40 = growthRate + netProfitMargin;
    const cash = kpiCalculations.getValue(data, 'Cash');
    const cashRunway = (avgMonthlyBurn > 0) ? cash / avgMonthlyBurn : 0;

    return [
      { id: 'arr', title: 'Annual Recurring Revenue', value: arr, unit: '$', trend: arr - prevRevenue, info: 'The predictable revenue a company can expect to receive every year.', benchmark: 'Directly reflects annual growth.' },
      { id: 'gpm', title: 'Gross Profit Margin', value: grossProfitMargin, unit: '%', info: 'Profitability after the cost of services. High margin is crucial for SaaS.', benchmark: 'Aim for >75%.' },
      { id: 'ltv_cac', title: 'LTV to CAC Ratio', value: ltvToCac, unit: ':1', info: 'Measures the ROI of customer acquisition efforts.', benchmark: 'A healthy ratio is 3:1 or higher.' },
      { id: 'churn', title: 'Customer Churn Rate', value: customerChurnRate, unit: '%', trend: -(customerChurnRate), info: 'The percentage of customers who cancel their subscriptions.', benchmark: 'Aim for < 5-7% annually.' },
      { id: 'rule_40', title: 'Rule of 40', value: ruleOf40, unit: '%', info: 'A key SaaS health metric. (Growth Rate + Profit Margin).', benchmark: 'Healthy SaaS companies should exceed 40%.' },
      { id: 'runway', title: 'Cash Runway', value: cashRunway, unit: ' months', info: 'How many months the company can operate before running out of money.', benchmark: 'Typically aim for 12-18 months post-funding.' },
      { id: 'cac', title: 'Customer Acquisition Cost', value: cac, unit: '$', info: 'The cost of winning a new customer. Lower is better.', benchmark: 'Varies by industry, but should be recovered quickly.' },
    ];
  },
  
  // --- NEW: Core Financial Health KPIs ---
  financial_health: (data) => {
    const currentAssets = kpiCalculations.getValue(data, 'Total Assets'); // Simplified for this example
    const currentLiabilities = kpiCalculations.getValue(data, 'Total Liabilities'); // Simplified
    const cash = kpiCalculations.getValue(data, 'Cash');
    const ar = kpiCalculations.getValue(data, 'Accounts Receivable');
    const inventory = kpiCalculations.getValue(data, 'Inventory');
    const totalLiabilities = kpiCalculations.getValue(data, 'Total Liabilities');
    const equity = kpiCalculations.getValue(data, 'Shareholder Equity');
    const revenue = kpiCalculations.getValue(data, 'Total Revenue');
    const netIncome = kpiCalculations.getValue(data, 'Net Income');

    const currentRatio = (currentLiabilities > 0) ? currentAssets / currentLiabilities : 0;
    const quickRatio = (currentLiabilities > 0) ? (cash + ar) / currentLiabilities : 0;
    const debtToEquity = (equity > 0) ? totalLiabilities / equity : 0;
    const workingCapital = currentAssets - currentLiabilities;
    const netProfitMargin = (revenue > 0) ? (netIncome / revenue) * 100 : 0;

    return [
        { id: 'current_ratio', title: 'Current Ratio', value: currentRatio, unit: ':1', info: 'Measures ability to pay short-term obligations.', benchmark: 'A ratio between 1.5 and 2 is generally considered healthy.' },
        { id: 'quick_ratio', title: 'Quick Ratio (Acid Test)', value: quickRatio, unit: ':1', info: 'A stricter liquidity test, excluding inventory.', benchmark: 'A ratio of 1:1 or higher is desirable.' },
        { id: 'debt_equity', title: 'Debt-to-Equity Ratio', value: debtToEquity, unit: ':1', info: 'Indicates how much debt a company is using to finance its assets.', benchmark: 'Varies by industry, but lower is often less risky.' },
        { id: 'working_capital', title: 'Working Capital', value: workingCapital, unit: '$', info: 'The capital available for day-to-day operations.', benchmark: 'Positive working capital is essential for operational liquidity.' },
        { id: 'net_profit_margin', title: 'Net Profit Margin', value: netProfitMargin, unit: '%', info: 'The ultimate measure of profitability after all expenses.', benchmark: 'A margin >10% is generally considered good.' },
    ];
  },

  // --- E-commerce KPIs (Unchanged) ---
  ecommerce: (data, inputs) => {
    const revenue = kpiCalculations.getValue(data, 'Total Revenue');
    const prevRevenue = kpiCalculations.getValue(data, 'Total Revenue', 'previous');
    const cogs = kpiCalculations.getValue(data, 'Cost of Goods Sold (COGS)');
    const marketingCost = kpiCalculations.getValue(data, 'Marketing Expenses');
    
    const { totalOrders, websiteVisitors, abandonedCarts, totalCarts } = inputs;
    
    const aov = (totalOrders > 0) ? revenue / totalOrders : 0;
    const prevAov = (inputs.prevTotalOrders > 0) ? prevRevenue / inputs.prevTotalOrders : 0;
    const conversionRate = (websiteVisitors > 0) ? (totalOrders / websiteVisitors) * 100 : 0;
    const cartAbandonmentRate = (totalCarts > 0) ? (abandonedCarts / totalCarts) * 100 : 0;
    const grossProfitMargin = (revenue > 0) ? ((revenue - cogs) / revenue) * 100 : 0;
    const roas = (marketingCost > 0) ? revenue / marketingCost : 0;

    return [
      { id: 'aov', title: 'Average Order Value', value: aov, unit: '$', trend: aov - prevAov, info: 'The average amount spent each time a customer places an order.', benchmark: 'Increasing AOV boosts revenue without new traffic.' },
      { id: 'conversion', title: 'Conversion Rate', value: conversionRate, unit: '%', info: 'The percentage of website visitors who make a purchase.', benchmark: 'A good rate is typically 2-3%.' },
      { id: 'cart_abandon', title: 'Cart Abandonment Rate', value: cartAbandonmentRate, unit: '%', info: 'The percentage of shoppers who add items to a cart but leave without completing the purchase.', benchmark: 'Average is ~70%. Aim lower.' },
      { id: 'gpm', title: 'Gross Profit Margin', value: grossProfitMargin, unit: '%', info: 'The percentage of revenue left after subtracting the cost of goods sold.', benchmark: 'Varies by product type, but higher is better.' },
      { id: 'roas', title: 'Return on Ad Spend', value: roas, unit: ':1', info: 'Measures the gross revenue generated for every dollar spent on advertising.', benchmark: 'A common target is 4:1.' },
    ];
  },
};

// --- UI COMPONENTS ---

const KPI_Card = ({ title, value, unit, trend, info, icon: Icon }) => {
  const isPositive = trend >= 0;
  const formatValue = (val) => {
    if (val === Infinity || isNaN(val)) return 'N/A';
    return val.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-500">{title}</h3>
          <Icon className="text-indigo-500" size={24} />
        </div>
        <p className="text-4xl font-bold text-gray-800">
          {unit === '$' && formatValue(value)}
          {unit !== '$' && formatValue(value)}
          <span className="text-2xl font-medium text-gray-500">{unit !== '$' && unit}</span>
        </p>
      </div>
      <div className="mt-4">
        {trend !== undefined && !isNaN(trend) && (
          <div className={`flex items-center text-sm ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {isPositive ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
            <span className="font-semibold ml-1">{formatValue(Math.abs(trend))} {unit}</span>
            <span className="text-gray-400 ml-1">vs prev. period</span>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-2">{info}</p>
      </div>
    </div>
  );
};

const IndustrySpecificInputs = ({ industry, onInputChange, inputs }) => {
    if (!industry || industry === 'financial_health') return null;

    const commonInputClass = "mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm";

    const startupInputs = (
        <>
            <label className="block text-sm font-medium text-gray-700">New Customers</label>
            <input type="number" name="newCustomers" value={inputs.newCustomers || ''} onChange={onInputChange} className={commonInputClass} placeholder="e.g., 50" />
            <label className="block text-sm font-medium text-gray-700 mt-4">Churned Customers</label>
            <input type="number" name="churnedCustomers" value={inputs.churnedCustomers || ''} onChange={onInputChange} className={commonInputClass} placeholder="e.g., 5" />
            <label className="block text-sm font-medium text-gray-700 mt-4">Total Customers (Start of Period)</label>
            <input type="number" name="totalCustomersStart" value={inputs.totalCustomersStart || ''} onChange={onInputChange} className={commonInputClass} placeholder="e.g., 500" />
            <label className="block text-sm font-medium text-gray-700 mt-4">Average Monthly Burn</label>
            <input type="number" name="avgMonthlyBurn" value={inputs.avgMonthlyBurn || ''} onChange={onInputChange} className={commonInputClass} placeholder="e.g., 50000" />
        </>
    );

    const ecommerceInputs = (
        <>
            <label className="block text-sm font-medium text-gray-700">Total Orders</label>
            <input type="number" name="totalOrders" value={inputs.totalOrders || ''} onChange={onInputChange} className={commonInputClass} placeholder="e.g., 1200" />
            <label className="block text-sm font-medium text-gray-700 mt-4">Website Visitors</label>
            <input type="number" name="websiteVisitors" value={inputs.websiteVisitors || ''} onChange={onInputChange} className={commonInputClass} placeholder="e.g., 40000" />
            <label className="block text-sm font-medium text-gray-700 mt-4">Total Carts Created</label>
            <input type="number" name="totalCarts" value={inputs.totalCarts || ''} onChange={onInputChange} className={commonInputClass} placeholder="e.g., 4000" />
            <label className="block text-sm font-medium text-gray-700 mt-4">Abandoned Carts</label>
            <input type="number" name="abandonedCarts" value={inputs.abandonedCarts || ''} onChange={onInputChange} className={commonInputClass} placeholder="e.g., 2800" />
        </>
    );

    const industryNameMap = {
        startup: 'Venture-Backed Startup',
        ecommerce: 'E-commerce',
    }

    return (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Enter Additional Data for <span className="capitalize text-indigo-600">{industryNameMap[industry]}</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {industry === 'startup' && startupInputs}
                {industry === 'ecommerce' && ecommerceInputs}
            </div>
        </div>
    );
};

const FileUpload = ({ onFileUpload, setIndustry, industry, setError }) => {
  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      if (window.Papa) {
        window.Papa.parse(acceptedFiles[0], {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            onFileUpload(results.data);
          },
        });
      } else {
        setError("File parser is still loading. Please try again in a moment.");
        console.error("PapaParse script not loaded yet.");
      }
    }
  }, [onFileUpload, setError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] } });

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <label htmlFor="industry" className="block text-lg font-medium text-gray-700 mb-2">1. Select Analysis Type</label>
        <select
          id="industry"
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm"
        >
          <option value="">-- Choose an analysis type --</option>
          <option value="financial_health">Core Financial Health</option>
          <option value="startup">Venture-Backed Startup (SaaS)</option>
          <option value="ecommerce">E-commerce</option>
        </select>
      </div>

      {industry && (
        <div>
          <label className="block text-lg font-medium text-gray-700 mb-2">2. Upload Your Financial Data</label>
          <div
            {...getRootProps()}
            className={`mt-2 flex justify-center px-6 pt-10 pb-12 border-2 ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 border-dashed'} rounded-md cursor-pointer transition-colors duration-300`}
          >
            <div className="space-y-1 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="flex text-sm text-gray-600">
                <p className="pl-1">
                  {isDragActive ? 'Drop the file here ...' : 'Drag & drop a CSV file here, or click to select'}
                </p>
                <input {...getInputProps()} className="sr-only" />
              </div>
              <p className="text-xs text-gray-500">Must be a CSV file. <a href="https://gist.githubusercontent.com/best-portfolio/8d94351add238768a26e0889c177341b/raw/f7a07c1345d315993b6883f05452efa179b99650/sample-financial-data.csv" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Download sample CSV</a></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Dashboard = ({ kpis, industry }) => {
    const iconMap = {
        startup: { arr: TrendingUp, gpm: DollarSign, ltv_cac: Target, churn: Users, rule_40: Activity, runway: Clock, cac: Target },
        ecommerce: { aov: ShoppingCart, conversion: Target, cart_abandon: ShoppingCart, gpm: DollarSign, roas: TrendingUp },
        financial_health: { current_ratio: Activity, quick_ratio: ShieldCheck, debt_equity: BarChart2, working_capital: Briefcase, net_profit_margin: FileText },
    };
    
    const industryNameMap = {
        startup: 'Venture-Backed Startup',
        ecommerce: 'E-commerce',
        financial_health: 'Core Financial Health'
    }

    const chartData = useMemo(() => {
        return kpis.map(kpi => ({ name: kpi.title.replace(/ /g, '\n'), value: kpi.value }));
    }, [kpis]);

    const pieData = useMemo(() => {
        if (industry === 'startup') {
            const ltv = kpis.find(k => k.id === 'ltv_cac')?.value || 0;
            return [{ name: 'LTV part', value: ltv }, { name: 'CAC part', value: 1 }];
        }
        if (industry === 'ecommerce') {
            const revenue = kpis.find(k => k.id === 'roas')?.value || 0;
            return [{ name: 'Revenue per $1 Ad Spend', value: revenue }, { name: 'Ad Spend', value: 1 }];
        }
        if (industry === 'financial_health') {
            const debt = kpis.find(k => k.id === 'debt_equity')?.value || 0;
            return [{ name: 'Debt', value: debt }, { name: 'Equity', value: 1 }];
        }
        return [];
    }, [kpis, industry]);

    const COLORS = ['#8884d8', '#82ca9d', '#FFBB28', '#FF8042', '#0088FE'];

    return (
        <div className="w-full animate-fade-in">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Your <span className="capitalize text-indigo-600">{industryNameMap[industry]}</span> Dashboard</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {kpis.map(kpi => (
                    <KPI_Card key={kpi.id} {...kpi} icon={iconMap[industry][kpi.id] || DollarSign} />
                ))}
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Key Metrics Overview</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 10, angle: -15, textAnchor: 'end' }} interval={0} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Bar dataKey="value" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Composition Analysis</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label>
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default function App() {
  const [fileData, setFileData] = useState(null);
  const [industry, setIndustry] = useState('');
  const [kpis, setKpis] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [additionalInputs, setAdditionalInputs] = useState({});

  // Dynamically load the PapaParse script when the component mounts
  useEffect(() => {
    const scriptId = 'papaparse-script';
    if (document.getElementById(scriptId)) return;
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      const existingScript = document.getElementById(scriptId);
      if (existingScript) document.body.removeChild(existingScript);
    };
  }, []);


  const handleFileUpload = (data) => {
    if (data.length === 0 || !data[0]['Metric']) {
        setError('Invalid CSV format. Please ensure it has a "Metric" column. Download the sample for the correct format.');
        setFileData(null);
        return;
    }
    setError('');
    setFileData(data);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAdditionalInputs(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  };

  const calculateKpis = () => {
    if (!fileData || !industry) {
      setError('Please select an analysis type and upload a file first.');
      return;
    }
    setIsLoading(true);
    setError('');
    
    setTimeout(() => {
      try {
        const calculationFn = kpiCalculations[industry];
        if (calculationFn) {
          const results = calculationFn(fileData, additionalInputs);
          setKpis(results);
        } else {
          setError('Invalid analysis type selected.');
        }
      } catch (e) {
        console.error(e);
        setError('An error occurred during calculation. Please check your data format.');
      } finally {
        setIsLoading(false);
      }
    }, 1000);
  };
  
  const handleReset = () => {
    setFileData(null);
    setKpis([]);
    setIndustry('');
    setError('');
    setAdditionalInputs({});
  }

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-gray-900">
            Momentum <span className="text-indigo-600">Financial Dashboard</span>
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
            Instantly generate a professional financial dashboard from your accounting data.
          </p>
        </header>

        <main className="max-w-5xl mx-auto">
          {kpis.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100">
              <FileUpload onFileUpload={handleFileUpload} setIndustry={setIndustry} industry={industry} setError={setError} />
              {fileData && (
                <>
                  <IndustrySpecificInputs industry={industry} onInputChange={handleInputChange} inputs={additionalInputs} />
                  <div className="mt-8 text-center">
                    <button
                      onClick={calculateKpis}
                      disabled={isLoading}
                      className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Processing...
                        </>
                      ) : 'Generate Dashboard'}
                    </button>
                  </div>
                </>
              )}
              {error && <p className="mt-4 text-center text-red-500 font-medium">{error}</p>}
            </div>
          ) : (
            <>
              <Dashboard kpis={kpis} industry={industry} />
              <div className="mt-8 text-center">
                <button
                  onClick={handleReset}
                  className="px-6 py-2 border border-gray-300 text-base font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Start Over
                </button>
              </div>
            </>
          )}
        </main>
        
        <footer className="text-center mt-16 text-sm text-gray-400">
            <p>A portfolio project by a Gemini developer.</p>
            <p>This tool processes data locally in your browser. No data is sent to any server.</p>
        </footer>
      </div>
    </div>
  );
}
