import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScenarioInput {
  topology: string[];
  assets: string[];
  vulnerabilities: string[];
  constraints: string[];
}

interface AttackPlan {
  id: string;
  objective: string;
  phases: AttackPhase[];
  successProbability: number;
  timeToCompromise: number;
  detectionLikelihood: number;
  impactScore: number;
  operationalCost: number;
  overallRisk: number;
}

interface AttackPhase {
  phase: string;
  action: string;
  method: string;
  timing: string;
  neuromorphicActivation: number;
  stealthScore: number;
  resources: string[];
}

interface DefensePlan {
  id: string;
  threatModel: string;
  mitigations: DefenseMitigation[];
  effectiveness: number;
  implementationCost: number;
  detectionCapability: number;
  responseTime: number;
}

interface DefenseMitigation {
  control: string;
  action: string;
  priority: string;
  timing: string;
  neuromorphicConfidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { scenario, mode = 'attack' } = await req.json();
    
    console.log('Neuromorphic Planner invoked:', { scenario, mode });

    // Simulate neuromorphic inference-only decision making
    const inferenceResults = performNeuromorphicInference(scenario, mode);
    
    // Generate plans based on inference
    const plans = mode === 'attack' 
      ? generateAttackPlans(inferenceResults, scenario)
      : generateDefensePlans(inferenceResults, scenario);

    // Rank and score plans
    const rankedPlans = rankPlans(plans);

    // Generate playbooks
    const playbooks = generatePlaybooks(rankedPlans, mode);

    // Generate visualization data for neuromorphic activity
    const visualizationData = generateNeuromorphicVisualization(inferenceResults);

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        plans: rankedPlans,
        playbooks,
        visualization: visualizationData,
        metadata: {
          inferenceTime: inferenceResults.inferenceTime,
          plansGenerated: rankedPlans.length,
          neuromorphicActivations: inferenceResults.totalActivations,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Neuromorphic planner error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Simulates neuromorphic inference using fixed weights and deterministic logic
function performNeuromorphicInference(scenario: any, mode: string) {
  const startTime = Date.now();
  
  // Simulated spiking neural network layers (inference-only, no training)
  const inputLayer = encodeScenarioToSpikes(scenario);
  const hiddenLayer = processHiddenLayerInference(inputLayer);
  const outputLayer = generateDecisionOutput(hiddenLayer, mode);
  
  const inferenceTime = Date.now() - startTime;
  
  return {
    inputLayer,
    hiddenLayer,
    outputLayer,
    inferenceTime,
    totalActivations: hiddenLayer.activations.length,
    timestamp: new Date().toISOString()
  };
}

// Encode scenario into spike train representation
function encodeScenarioToSpikes(scenario: any) {
  const spikes = [];
  const features = [
    ...(scenario.topology || []),
    ...(scenario.assets || []),
    ...(scenario.vulnerabilities || [])
  ];
  
  features.forEach((feature, idx) => {
    // Simulate temporal encoding of features as spike times
    const spikeTime = idx * 10 + Math.random() * 5;
    const neuronId = Math.floor(Math.random() * 100);
    spikes.push({
      neuronId,
      time: spikeTime,
      feature,
      amplitude: 0.7 + Math.random() * 0.3
    });
  });
  
  return { spikes, count: spikes.length };
}

// Hidden layer processing (deterministic inference with fixed weights)
function processHiddenLayerInference(inputLayer: any) {
  const activations = [];
  const weights = generateFixedWeights(inputLayer.count, 50); // Fixed weights, no learning
  
  for (let i = 0; i < 50; i++) {
    let activation = 0;
    inputLayer.spikes.forEach((spike: any) => {
      const weight = weights[spike.neuronId % weights.length][i];
      activation += spike.amplitude * weight;
    });
    
    // Leaky integrate-and-fire neuron simulation
    const threshold = 0.5;
    if (activation > threshold) {
      activations.push({
        neuronId: i,
        activation: activation,
        fired: true,
        timestamp: Date.now() + i * 2
      });
    }
  }
  
  return { activations, count: activations.length };
}

// Generate decision output from neuromorphic inference
function generateDecisionOutput(hiddenLayer: any, mode: string) {
  const decisions = [];
  const outputNeurons = 20;
  
  for (let i = 0; i < outputNeurons; i++) {
    const relevantActivations = hiddenLayer.activations.filter(
      (a: any) => (a.neuronId + i) % 3 === 0
    );
    
    const decisionScore = relevantActivations.reduce(
      (sum: number, a: any) => sum + a.activation, 0
    ) / (relevantActivations.length || 1);
    
    decisions.push({
      actionId: i,
      score: decisionScore,
      confidence: Math.min(decisionScore / 2, 1),
      category: mode === 'attack' ? getAttackAction(i) : getDefenseAction(i)
    });
  }
  
  return { decisions: decisions.sort((a, b) => b.score - a.score) };
}

// Fixed weight matrix (inference-only, pre-configured)
function generateFixedWeights(inputSize: number, hiddenSize: number): number[][] {
  const weights: number[][] = [];
  for (let i = 0; i < inputSize; i++) {
    weights[i] = [];
    for (let j = 0; j < hiddenSize; j++) {
      // Deterministic weight generation (simulating pre-trained fixed weights)
      weights[i][j] = Math.sin(i * j * 0.1) * 0.5 + 0.5;
    }
  }
  return weights;
}

function getAttackAction(id: number): string {
  const actions = [
    'Initial Access', 'Execution', 'Persistence', 'Privilege Escalation',
    'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement',
    'Collection', 'Exfiltration', 'Command and Control', 'Resource Development',
    'Reconnaissance', 'Weaponization', 'Installation', 'Exploitation',
    'Data Staging', 'Network Propagation', 'Payload Delivery', 'Impact'
  ];
  return actions[id % actions.length];
}

function getDefenseAction(id: number): string {
  const actions = [
    'Access Control', 'Network Segmentation', 'Monitoring & Detection', 'Incident Response',
    'Patch Management', 'Endpoint Protection', 'Data Encryption', 'User Training',
    'Backup & Recovery', 'Vulnerability Scanning', 'Threat Hunting', 'SIEM Configuration',
    'Firewall Rules', 'IDS/IPS Deployment', 'Zero Trust Implementation', 'MFA Enforcement',
    'Log Analysis', 'Threat Intelligence', 'Security Auditing', 'Access Review'
  ];
  return actions[id % actions.length];
}

// Generate attack plans from neuromorphic inference
function generateAttackPlans(inference: any, scenario: any): AttackPlan[] {
  const plans: AttackPlan[] = [];
  const topDecisions = inference.outputLayer.decisions.slice(0, 5);
  
  topDecisions.forEach((decision: any, idx: number) => {
    const phases: AttackPhase[] = [];
    
    // Generate multi-phase attack based on neuromorphic decisions
    const phaseCount = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < phaseCount; i++) {
      phases.push({
        phase: `Phase ${i + 1}`,
        action: decision.category,
        method: generateMethod(decision.category),
        timing: `T+${i * 12}h to T+${(i + 1) * 12}h`,
        neuromorphicActivation: decision.score,
        stealthScore: 0.3 + Math.random() * 0.6,
        resources: generateResources(decision.category)
      });
    }
    
    plans.push({
      id: `attack-plan-${idx + 1}`,
      objective: generateObjective(scenario),
      phases,
      successProbability: 0.4 + decision.confidence * 0.5,
      timeToCompromise: phaseCount * 12 + Math.random() * 24,
      detectionLikelihood: 0.2 + (1 - decision.score) * 0.6,
      impactScore: 5 + decision.score * 5,
      operationalCost: phaseCount * 1000 + Math.random() * 5000,
      overallRisk: calculateRisk(decision.score, phaseCount)
    });
  });
  
  return plans;
}

// Generate defense plans from neuromorphic inference
function generateDefensePlans(inference: any, scenario: any): DefensePlan[] {
  const plans: DefensePlan[] = [];
  const topDecisions = inference.outputLayer.decisions.slice(0, 5);
  
  topDecisions.forEach((decision: any, idx: number) => {
    const mitigations: DefenseMitigation[] = [];
    
    const mitigationCount = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < mitigationCount; i++) {
      mitigations.push({
        control: decision.category,
        action: generateDefenseAction(decision.category),
        priority: i < 2 ? 'Critical' : i < 4 ? 'High' : 'Medium',
        timing: `Implement within ${(i + 1) * 24}h`,
        neuromorphicConfidence: decision.confidence
      });
    }
    
    plans.push({
      id: `defense-plan-${idx + 1}`,
      threatModel: generateThreatModel(scenario),
      mitigations,
      effectiveness: 0.6 + decision.confidence * 0.3,
      implementationCost: mitigationCount * 2000 + Math.random() * 10000,
      detectionCapability: 0.5 + decision.score * 0.4,
      responseTime: 2 + (1 - decision.confidence) * 10
    });
  });
  
  return plans;
}

function generateMethod(action: string): string {
  const methods: { [key: string]: string[] } = {
    'Initial Access': ['Phishing', 'Exploiting Public-Facing Application', 'Valid Accounts'],
    'Execution': ['Command-Line Interface', 'PowerShell', 'Scripting'],
    'Persistence': ['Registry Run Keys', 'Scheduled Task', 'Service Creation'],
    'Privilege Escalation': ['Exploitation for Privilege Escalation', 'Valid Accounts', 'Process Injection'],
    'Default': ['Standard Technique', 'Advanced Method', 'Automated Tool']
  };
  
  const actionMethods = methods[action] || methods['Default'];
  return actionMethods[Math.floor(Math.random() * actionMethods.length)];
}

function generateResources(action: string): string[] {
  const resources = [
    'Network Access', 'Credentials', 'Exploitation Framework', 'C2 Infrastructure',
    'Custom Malware', 'Living-off-the-Land Binaries', 'Social Engineering',
    'Zero-Day Exploits', 'Proxy Infrastructure', 'Data Exfiltration Tools'
  ];
  
  const count = 2 + Math.floor(Math.random() * 3);
  return resources.sort(() => Math.random() - 0.5).slice(0, count);
}

function generateObjective(scenario: any): string {
  const objectives = [
    'Gain persistent access to critical infrastructure',
    'Exfiltrate sensitive data from database servers',
    'Establish command and control for long-term operations',
    'Compromise privileged accounts for lateral movement',
    'Deploy ransomware across enterprise network'
  ];
  return objectives[Math.floor(Math.random() * objectives.length)];
}

function generateThreatModel(scenario: any): string {
  const models = [
    'Advanced Persistent Threat targeting financial data',
    'Ransomware group focused on critical infrastructure',
    'Nation-state actor conducting espionage',
    'Insider threat with privileged access',
    'Opportunistic cybercriminal exploiting known vulnerabilities'
  ];
  return models[Math.floor(Math.random() * models.length)];
}

function generateDefenseAction(control: string): string {
  const actions: { [key: string]: string[] } = {
    'Access Control': ['Implement least privilege', 'Review access rights', 'Enable MFA'],
    'Monitoring & Detection': ['Deploy SIEM rules', 'Configure alerting', 'Enable audit logging'],
    'Patch Management': ['Apply critical patches', 'Update vulnerable systems', 'Test patches'],
    'Default': ['Implement security control', 'Configure defense mechanism', 'Deploy protection']
  };
  
  const controlActions = actions[control] || actions['Default'];
  return controlActions[Math.floor(Math.random() * controlActions.length)];
}

function calculateRisk(score: number, phaseCount: number): number {
  return Math.min(10, (score * 5) + (phaseCount * 0.5) + Math.random() * 2);
}

// Rank plans by risk/utility metrics
function rankPlans(plans: any[]): any[] {
  return plans.sort((a, b) => {
    if ('overallRisk' in a) {
      // Attack plans - higher risk first
      return b.overallRisk - a.overallRisk;
    } else {
      // Defense plans - higher effectiveness first
      return b.effectiveness - a.effectiveness;
    }
  });
}

// Generate human-readable and machine-readable playbooks
function generatePlaybooks(plans: any[], mode: string) {
  return plans.map((plan, idx) => ({
    playbookId: `${mode}-playbook-${idx + 1}`,
    planId: plan.id,
    title: mode === 'attack' 
      ? `Attack Emulation: ${plan.objective}`
      : `Defense Strategy: ${plan.threatModel}`,
    description: generatePlaybookDescription(plan, mode),
    steps: generatePlaybookSteps(plan, mode),
    metadata: {
      generated: new Date().toISOString(),
      neuromorphicInference: true,
      mode: 'inference-only',
      priority: idx + 1
    },
    machineReadable: {
      format: 'json',
      schema: 'apt-playbook-v1',
      content: plan
    }
  }));
}

function generatePlaybookDescription(plan: any, mode: string): string {
  if (mode === 'attack') {
    return `This attack emulation playbook targets ${plan.objective} with an estimated success probability of ${(plan.successProbability * 100).toFixed(1)}% and detection likelihood of ${(plan.detectionLikelihood * 100).toFixed(1)}%. Time to compromise: ${plan.timeToCompromise.toFixed(1)} hours. Overall risk score: ${plan.overallRisk.toFixed(1)}/10.`;
  } else {
    return `This defense strategy addresses ${plan.threatModel} with an effectiveness rating of ${(plan.effectiveness * 100).toFixed(1)}% and detection capability of ${(plan.detectionCapability * 100).toFixed(1)}%. Implementation cost: $${plan.implementationCost.toFixed(0)}. Response time: ${plan.responseTime.toFixed(1)} hours.`;
  }
}

function generatePlaybookSteps(plan: any, mode: string): any[] {
  if (mode === 'attack') {
    return plan.phases.map((phase: any, idx: number) => ({
      stepNumber: idx + 1,
      phase: phase.phase,
      action: phase.action,
      method: phase.method,
      timing: phase.timing,
      neuromorphicScore: phase.neuromorphicActivation.toFixed(3),
      stealthLevel: (phase.stealthScore * 100).toFixed(1) + '%',
      requiredResources: phase.resources,
      notes: `Neuromorphic activation: ${(phase.neuromorphicActivation * 100).toFixed(1)}%`
    }));
  } else {
    return plan.mitigations.map((mitigation: any, idx: number) => ({
      stepNumber: idx + 1,
      control: mitigation.control,
      action: mitigation.action,
      priority: mitigation.priority,
      timing: mitigation.timing,
      confidence: (mitigation.neuromorphicConfidence * 100).toFixed(1) + '%',
      notes: `Neuromorphic confidence: ${(mitigation.neuromorphicConfidence * 100).toFixed(1)}%`
    }));
  }
}

// Generate visualization data for neuromorphic activity
function generateNeuromorphicVisualization(inference: any) {
  return {
    inputSpikes: inference.inputLayer.spikes.slice(0, 50),
    hiddenActivations: inference.hiddenLayer.activations.slice(0, 30),
    outputDecisions: inference.outputLayer.decisions.slice(0, 10),
    timeline: generateSpikeTimeline(inference),
    networkGraph: generateNetworkGraph(inference)
  };
}

function generateSpikeTimeline(inference: any) {
  const timeline = [];
  const maxTime = 200;
  
  for (let t = 0; t < maxTime; t += 10) {
    const spikesAtTime = inference.inputLayer.spikes.filter(
      (s: any) => Math.abs(s.time - t) < 5
    ).length;
    
    timeline.push({
      time: t,
      spikeCount: spikesAtTime,
      activity: spikesAtTime / 10
    });
  }
  
  return timeline;
}

function generateNetworkGraph(inference: any) {
  const nodes = [];
  const edges = [];
  
  // Input layer nodes
  for (let i = 0; i < Math.min(20, inference.inputLayer.count); i++) {
    nodes.push({ id: `input-${i}`, layer: 'input', active: true });
  }
  
  // Hidden layer nodes
  for (let i = 0; i < Math.min(15, inference.hiddenLayer.count); i++) {
    const activation = inference.hiddenLayer.activations[i];
    nodes.push({ 
      id: `hidden-${i}`, 
      layer: 'hidden', 
      active: activation?.fired || false,
      activation: activation?.activation || 0
    });
  }
  
  // Output layer nodes
  for (let i = 0; i < Math.min(10, inference.outputLayer.decisions.length); i++) {
    const decision = inference.outputLayer.decisions[i];
    nodes.push({ 
      id: `output-${i}`, 
      layer: 'output', 
      active: decision.score > 0.5,
      score: decision.score
    });
  }
  
  // Generate sample edges
  for (let i = 0; i < 30; i++) {
    const source = Math.floor(Math.random() * 20);
    const target = Math.floor(Math.random() * 15);
    edges.push({
      source: `input-${source}`,
      target: `hidden-${target}`,
      weight: Math.random()
    });
  }
  
  return { nodes, edges };
}
