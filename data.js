// Canonical demo state migrated from the existing Observatory sample.
// Deliberately contains NO space/station/stage fields.

const E = (value, confidence=0.8, basis='user_assessed', evidenceIds=[]) => ({ value, confidence, basis, evidenceIds });

export const entities = [
  {
    id:'website', type:'project', title:'Website launch',
    intent:'Make one public surface of the work reachable and legible.',
    outputs:[{ id:'website-live', description:'Public landing page', currentProgress:E(0.62,.9,'observed',['ev-site-1']), importance:E(9,.9), consequenceOfInaction:E(6,.7) }],
    constraints:[{ id:'site-scope', description:'Scope can expand faster than delivery.', severity:'degrading', consequenceOfInaction:E(5,.7), allowedAffectedEntityIds:['game'] }],
    dependencies:[{ id:'sleep-protected', conditionDescription:'Enough baseline capacity to finish without sacrificing sleep.' }],
    relationships:[{targetId:'game',relation:'informs'},{targetId:'sleep',relation:'requires'},{targetId:'observatory-note',relation:'informs'}],
    evidence:[{id:'ev-site-1',description:'Landing shell already exists.',confidence:.9}],
    requiredResources:['computer','internet']
  },
  {
    id:'game', type:'concept', title:'Game idea',
    intent:'Test whether chosen visibility can be made playful rather than threatening.',
    outputs:[{ id:'game-prototype', description:'Playable core-room prototype', currentProgress:E(.28,.7,'assumed'), importance:E(6,.75), consequenceOfInaction:E(2,.6) }],
    constraints:[{ id:'game-definition', description:'Core experience remains under-specified.', severity:'degrading', consequenceOfInaction:E(2,.6) }],
    dependencies:[],
    relationships:[{targetId:'visibility',relation:'informs'},{targetId:'website',relation:'supports'}],
    evidence:[{id:'ev-game-1',description:'Concept exists but is still exploratory.',confidence:.7}]
  },
  {
    id:'bullying', type:'concept', title:'Fear of being singled out',
    intent:'Understand the trigger pattern without allowing it to govern unrelated action.',
    outputs:[{ id:'trigger-map', description:'Trigger-pattern note', currentProgress:E(.35,.6,'assumed'), importance:E(8,.75), consequenceOfInaction:E(4,.7) }],
    constraints:[{ id:'threat-generalisation', description:'Visibility is sometimes modelled as threat by default.', severity:'degrading', consequenceOfInaction:E(5,.65) }],
    dependencies:[],
    relationships:[{targetId:'visibility',relation:'informs'}],
    evidence:[{id:'ev-threat-1',description:'Visibility concern influences several choices.',confidence:.72}]
  },
  {
    id:'visibility', type:'concept', title:'Chosen visibility',
    intent:'Test whether authorship changes the meaning of being noticed.',
    outputs:[{ id:'visibility-test', description:'Small controlled authorship experiment', currentProgress:E(.15,.6,'assumed'), importance:E(7,.7), consequenceOfInaction:E(3,.55) }],
    constraints:[{ id:'visibility-risk', description:'Exposure may be experienced as loss of control.', severity:'degrading', consequenceOfInaction:E(3,.6) }],
    dependencies:[],
    relationships:[{targetId:'bullying',relation:'derivedFrom'},{targetId:'game',relation:'informs'},{targetId:'masking',relation:'informs'}],
    evidence:[{id:'ev-vis-1',description:'Chosen and imposed visibility are experienced differently.',confidence:.68}]
  },
  {
    id:'sleep', type:'commitment', title:'Sleep',
    intent:'Protect baseline cognitive capacity tonight.',
    outputs:[{ id:'sleep-window', description:'Protected sleep window', currentProgress:E(.2,.9,'observed'), importance:E(10,.95), consequenceOfInaction:E(9,.9) }],
    constraints:[{ id:'late-work', description:'Late work can consume the sleep boundary.', severity:'blocking', consequenceOfInaction:E(8,.9), allowedAffectedEntityIds:['website','game','friend'] }],
    dependencies:[],
    relationships:[],
    evidence:[{id:'ev-sleep-1',description:'Baseline capacity depends on sufficient rest.',confidence:.95}]
  },
  {
    id:'friend', type:'commitment', title:'Reply to best friend',
    intent:'Close a live social obligation with one honest message.',
    outputs:[{ id:'friend-reply', description:'Honest reply sent', currentProgress:E(0,.95,'observed'), importance:E(7,.85), consequenceOfInaction:E(6,.8) }],
    constraints:[{ id:'reply-overthinking', description:'Over-composing increases friction without improving honesty.', severity:'degrading', consequenceOfInaction:E(5,.75) }],
    dependencies:[],
    relationships:[],
    evidence:[{id:'ev-friend-1',description:'A reply is still outstanding.',confidence:.95}]
  },
  {
    id:'masking', type:'concept', title:'Act normal enough',
    intent:'Test whether this old protective rule is still useful.',
    outputs:[{ id:'masking-review', description:'Explicit keep/revise/release judgment', currentProgress:E(.1,.6,'assumed'), importance:E(4,.6), consequenceOfInaction:E(1,.5) }],
    constraints:[], dependencies:[],
    relationships:[{targetId:'visibility',relation:'informs'}],
    evidence:[{id:'ev-mask-1',description:'Protective rule may be outliving its original context.',confidence:.55}]
  },
  {
    id:'oldwork', type:'document', title:'Old assignments',
    intent:'Retain context without active obligation.',
    outputs:[{ id:'oldwork-index', description:'Reference retained', currentProgress:E(1,.95,'observed'), importance:E(2,.8), consequenceOfInaction:E(0,.9) }],
    constraints:[], dependencies:[], relationships:[], evidence:[]
  },
  {
    id:'observatory-note', type:'document', title:'Observatory note',
    intent:'Maintain a concise synthesis of the current field.',
    outputs:[{ id:'field-note', description:'Current synthesis note', currentProgress:E(.55,.75,'observed'), importance:E(6,.75), consequenceOfInaction:E(2,.6) }],
    constraints:[], dependencies:[],
    relationships:[{targetId:'website',relation:'informs'},{targetId:'game',relation:'informs'},{targetId:'friend',relation:'informs'},{targetId:'sleep',relation:'informs'}],
    evidence:[{id:'ev-note-1',description:'Synthesis note exists and is partially current.',confidence:.8}]
  }
];

export const actionHypotheses = [
  {
    id:'act-site-shell', entityId:'website', description:'Finish and publish the current landing shell', provenance:'human_proposed', mechanism:'DIRECT_PROGRESS',
    effects:[{targetType:'output',targetId:'website-live',effectMagnitude:E(.32,.8,'user_assessed'),successProbability:E(.9,.8,'user_assessed')}],
    executionBurden:E(3,.8,'user_assessed'),
    preconditions:{requiredResources:['computer','internet']}, authority:'user_confirmation_required', authorityGrantId:'grant-principal-jd', affectedParties:['site visitors']
  },
  {
    id:'act-site-trim', entityId:'website', description:'Cut non-essential scope before publishing', provenance:'system_generated', mechanism:'CONSTRAINT_RELIEF',
    effects:[
      {targetType:'constraint',targetId:'site-scope',effectMagnitude:E(.75,.7,'assumed'),successProbability:E(.9,.75,'assumed')},
      {targetType:'output',targetId:'website-live',effectMagnitude:E(.18,.7,'assumed'),successProbability:E(.85,.7,'assumed')}
    ],
    executionBurden:E(1.5,.75,'assumed'), authority:'recommend_only', authorityGrantId:'grant-low-risk-runtime'
  },
  {
    id:'act-site-question', entityId:'website', description:'Write the one sentence that defines what must be public tonight', provenance:'system_generated', mechanism:'INFORMATION_GAIN',
    effects:[{targetType:'information',targetId:'site-scope',effectMagnitude:E(.8,.7,'assumed'),successProbability:E(.9,.75,'assumed')}],
    executionBurden:E(.6,.8,'assumed'), authority:'recommend_only', authorityGrantId:'grant-low-risk-runtime'
  },
  {
    id:'act-game-test', entityId:'game', description:'Play the core room for ten minutes and record one failure', provenance:'human_proposed', mechanism:'INFORMATION_GAIN',
    effects:[
      {targetType:'information',targetId:'game-definition',effectMagnitude:E(.75,.75,'user_assessed'),successProbability:E(.85,.75,'user_assessed')},
      {targetType:'output',targetId:'game-prototype',effectMagnitude:E(.12,.6,'assumed'),successProbability:E(.8,.7,'assumed')}
    ],
    executionBurden:E(1,.85,'user_assessed'), authority:'recommend_only', authorityGrantId:'grant-low-risk-runtime'
  },
  {
    id:'act-sleep-stop', entityId:'sleep', description:'Set and keep a stop-work boundary tonight', provenance:'human_proposed', mechanism:'CONSTRAINT_RELIEF',
    effects:[
      {targetType:'constraint',targetId:'late-work',effectMagnitude:E(.9,.9,'user_assessed'),successProbability:E(.8,.8,'user_assessed')},
      {targetType:'output',targetId:'sleep-window',effectMagnitude:E(.7,.8,'user_assessed'),successProbability:E(.8,.8,'user_assessed')}
    ],
    executionBurden:E(1.4,.8,'user_assessed'), authority:'recommend_only', authorityGrantId:'grant-principal-jd'
  },
  {
    id:'act-friend-send', entityId:'friend', description:'Send one honest three-sentence reply', provenance:'human_proposed', mechanism:'DIRECT_PROGRESS',
    effects:[
      {targetType:'output',targetId:'friend-reply',effectMagnitude:E(1,.9,'user_assessed'),successProbability:E(.95,.9,'user_assessed')},
      {targetType:'constraint',targetId:'reply-overthinking',effectMagnitude:E(.8,.8,'assumed'),successProbability:E(.9,.8,'assumed')}
    ],
    executionBurden:E(1.2,.85,'user_assessed'), authority:'user_confirmation_required', authorityGrantId:'grant-principal-jd', affectedParties:['best friend'], requiredPermissions:[]
  },
  {
    id:'act-visibility-small', entityId:'visibility', description:'Publish one small piece under controlled visibility', provenance:'system_generated', mechanism:'OPTION_CREATION',
    effects:[
      {targetType:'output',targetId:'visibility-test',effectMagnitude:E(.55,.6,'assumed'),successProbability:E(.65,.55,'assumed')},
      {targetType:'option',targetId:'visibility-test',effectMagnitude:E(.7,.6,'assumed'),successProbability:E(.7,.6,'assumed')}
    ],
    executionBurden:E(2.5,.65,'assumed'), authority:'user_confirmation_required', authorityGrantId:'grant-principal-jd', affectedParties:['public audience']
  }
];

export const worldSnapshot = {
  timestamp: new Date().toISOString(),
  isBusinessHours:{ value:false, confidence:.99, observedAt:new Date().toISOString(), sourceIds:['system-clock'] },
  dependencies:{
    'sleep-protected':{ value:true, confidence:.65, observedAt:new Date().toISOString(), sourceIds:['demo-state'] }
  },
  resources:{ computer:{value:true,confidence:.95}, internet:{value:true,confidence:.9} },
  permissions:{}
};

export const policies = [
  {
    id:'balanced', name:'Balanced', purpose:'Balance progress, relief, urgency, learning and burden.',
    weights:{outputProgress:2.0,blockageRelief:2.0,downstreamReach:1.2,urgencyAddressed:2.2,informationGain:1.4,optionValue:1.0,executionBurden:-1.0},
    authority:{selectedBy:'system_default',rationale:'Neutral demonstration policy.'}, status:'provisional', rationale:'Balanced demonstration policy.'
  },
  {
    id:'protect-deadlines', name:'Protect deadlines', purpose:'Prefer actions that address costly delay.',
    weights:{outputProgress:1.5,blockageRelief:1.8,downstreamReach:1.0,urgencyAddressed:3.2,informationGain:.8,optionValue:.5,executionBurden:-.8},
    authority:{selectedBy:'user',rationale:'Use when delay dominates.'}, status:'accepted', rationale:'Urgency receives greater normative weight.'
  },
  {
    id:'derisk-first', name:'De-risk first', purpose:'Prefer information and reversible option creation.',
    weights:{outputProgress:1.0,blockageRelief:1.2,downstreamReach:.7,urgencyAddressed:1.0,informationGain:3.4,optionValue:2.4,executionBurden:-1.0},
    authority:{selectedBy:'user',rationale:'Use when uncertainty dominates.'}, status:'accepted', rationale:'Learning and option value receive greater normative weight.'
  }
];

export const statusQuoValues = {
  website: 0.15,
  game: 0.05,
  bullying: 0.1,
  visibility: 0.08,
  sleep: 0.3,
  friend: 0.1,
  masking: 0.15,
  oldwork: 0.5,
  'observatory-note': 0.1
};


// v1.2: uncertainty models live outside canonical entities. They describe admitted
// uncertainty in the evaluation model, not properties of reality itself.
export const uncertaintyModels = [
  {
    id:'uncertainty-website-v1',
    entityId:'website',
    description:'Joint uncertainty model for the Website launch action set.',
    parameters:[
      { id:'shell-success', path:'hypothesis:act-site-shell.effects.0.successProbability.value', distribution:{type:'clamped_normal',sd:.08,min:0,max:1}, sweepDomain:[0.35,1], rationale:'Probability that finishing the existing shell actually produces a publishable surface.' },
      { id:'shell-magnitude', path:'hypothesis:act-site-shell.effects.0.effectMagnitude.value', distribution:{type:'clamped_normal',sd:.06,min:0,max:1}, sweepDomain:[0.10,0.60], rationale:'How much direct output progress the shell action would produce if successful.' },
      { id:'shell-burden', path:'hypothesis:act-site-shell.executionBurden.value', distribution:{type:'clamped_normal',sd:.45,min:.2,max:10}, sweepDomain:[1,6], rationale:'Execution burden varies with fatigue and implementation friction.' },
      { id:'trim-success', path:'hypothesis:act-site-trim.effects.0.successProbability.value', distribution:{type:'clamped_normal',sd:.08,min:0,max:1}, sweepDomain:[0.35,1], rationale:'Probability that cutting scope actually relieves the modeled scope constraint.' },
      { id:'trim-magnitude', path:'hypothesis:act-site-trim.effects.0.effectMagnitude.value', distribution:{type:'clamped_normal',sd:.10,min:0,max:1}, sweepDomain:[0.20,1], rationale:'Magnitude of scope relief if trimming succeeds.' },
      { id:'question-success', path:'hypothesis:act-site-question.effects.0.successProbability.value', distribution:{type:'clamped_normal',sd:.07,min:0,max:1}, sweepDomain:[0.35,1], rationale:'Probability that one defining sentence materially reduces uncertainty.' },
      { id:'question-magnitude', path:'hypothesis:act-site-question.effects.0.effectMagnitude.value', distribution:{type:'clamped_normal',sd:.10,min:0,max:1}, sweepDomain:[0.20,1], rationale:'Information gain produced by the scope-defining question.' }
    ],
    // Block-diagonal-ish correlation structure. The shell estimates share causes;
    // the trim pair share causes; the inquiry pair share causes. We do not pretend
    // they are independent merely because arrays make that convenient.
    correlationMatrix:[
      [1.00, 0.45,-0.25, 0.00,0.00,0.00,0.00],
      [0.45, 1.00,-0.20, 0.00,0.00,0.00,0.00],
      [-0.25,-0.20,1.00, 0.00,0.00,0.00,0.00],
      [0.00, 0.00,0.00, 1.00,0.40,0.00,0.00],
      [0.00, 0.00,0.00, 0.40,1.00,0.00,0.00],
      [0.00, 0.00,0.00, 0.00,0.00,1.00,0.35],
      [0.00, 0.00,0.00, 0.00,0.00,0.35,1.00]
    ],
    scenarios:[
      { id:'ordinary-run', weight:.68, description:'Normal working conditions.', overrides:{} },
      { id:'fatigue-friction', weight:.32, description:'Higher burden and slightly lower direct-delivery success.', overrides:{
        'hypothesis:act-site-shell.executionBurden.value':4.2,
        'hypothesis:act-site-shell.effects.0.successProbability.value':.82,
        'hypothesis:act-site-trim.executionBurden.value':2.0
      }}
    ]
  }
];

// v1.3 Garden generator configuration lives outside canonical entities.
// Its search ceilings are intentionally < 1: exhausting modeled loci is not
// equivalent to exhausting the action space, especially for option creation.
export const gardenGeneratorConfig = {
  id:'garden-generator-v1',
  coverageThreshold:0.70,
  highUncertaintyThreshold:0.34,
  informationGainReturnThreshold:0.58,
  mechanismCeilings:{
    DIRECT_PROGRESS:0.88,
    CONSTRAINT_RELIEF:0.84,
    INFORMATION_GAIN:0.68,
    OPTION_CREATION:0.55
  },
  mechanisms:{
    DIRECT_PROGRESS:{enabled:true},
    CONSTRAINT_RELIEF:{enabled:true},
    INFORMATION_GAIN:{enabled:true},
    OPTION_CREATION:{enabled:true}
  }
};

// v1.4 Harbour authority lives outside the canonical entity graph. These grants
// describe who may cause which classes of world change, for how long, and how
// much capacity remains. They are premises, not properties of the entities.
export const authorityGrants = [
  {
    id:'grant-principal-jd', principalId:'JD', delegateId:'JD', authorityClass:'principal',
    scope:{allowedActionTypes:['publish','message','internal_change','research','rest'],domainRestrictions:['public_web','private_social','internal','personal']},
    grantedAt:'2026-08-11T00:00:00+10:00', revocable:true,
    limits:{maxFinancialCommitment:5000,maxExecutions:50},
    consumed:{financialCommitment:0,executionCount:0}, reserved:{financialCommitment:0,executionCount:0}, status:'active'
  },
  {
    id:'grant-low-risk-runtime', principalId:'JD', delegateId:'observatory-runtime', authorityClass:'delegated_low_risk',
    scope:{allowedActionTypes:['internal_change','research'],domainRestrictions:['internal']},
    grantedAt:'2026-08-11T00:00:00+10:00', expiresAt:'2026-08-12T00:00:00+10:00', revocable:true,
    limits:{maxFinancialCommitment:5000,maxExecutions:10},
    consumed:{financialCommitment:0,executionCount:0}, reserved:{financialCommitment:0,executionCount:0}, status:'active'
  }
];

export const executionFootprints = {
  'act-site-shell':{
    actionId:'act-site-shell',actionType:'publish',domain:'public_web',affectedParties:['site visitors'],
    resourceCommitments:[],obligationsCreated:[],
    disclosures:[{recipient:'public internet',sensitivityLevel:'public',informationScope:['landing-page content']}],
    reversibility:{class:'practically_irreversible',estimatedReversalCost:1,requiresThirdPartyCooperation:true,irreversibleDimensions:['disclosure','reputation','temporal']},
    expectedWorldChanges:['A public URL becomes reachable and may be copied or cached by third parties.']
  },
  'act-site-trim':{
    actionId:'act-site-trim',actionType:'internal_change',domain:'internal',affectedParties:[],resourceCommitments:[],obligationsCreated:[],disclosures:[],
    reversibility:{class:'freely_reversible',requiresThirdPartyCooperation:false,irreversibleDimensions:[]},
    expectedWorldChanges:['Internal website scope is reduced before publication.']
  },
  'act-site-question':{
    actionId:'act-site-question',actionType:'research',domain:'internal',affectedParties:[],resourceCommitments:[],obligationsCreated:[],disclosures:[],
    reversibility:{class:'freely_reversible',requiresThirdPartyCooperation:false,irreversibleDimensions:[]},
    expectedWorldChanges:['The decision model gains a sharper definition of minimum publishable scope.']
  },
  'act-game-test':{
    actionId:'act-game-test',actionType:'research',domain:'internal',affectedParties:[],resourceCommitments:[],obligationsCreated:[],disclosures:[],
    reversibility:{class:'freely_reversible',requiresThirdPartyCooperation:false,irreversibleDimensions:[]},
    expectedWorldChanges:['A test observation is created.']
  },
  'act-sleep-stop':{
    actionId:'act-sleep-stop',actionType:'rest',domain:'personal',affectedParties:['JD'],resourceCommitments:[],obligationsCreated:[],disclosures:[],
    reversibility:{class:'costly_reversible',requiresThirdPartyCooperation:false,irreversibleDimensions:['temporal']},
    expectedWorldChanges:['Further work time is deliberately forgone tonight.']
  },
  'act-friend-send':{
    actionId:'act-friend-send',actionType:'message',domain:'private_social',affectedParties:['best friend'],resourceCommitments:[],
    obligationsCreated:[],disclosures:[{recipient:'best friend',sensitivityLevel:'confidential',informationScope:['message content']}],
    reversibility:{class:'practically_irreversible',requiresThirdPartyCooperation:true,irreversibleDimensions:['disclosure','relational','temporal']},
    expectedWorldChanges:['The message is received and may alter the relationship state.']
  },
  'act-visibility-small':{
    actionId:'act-visibility-small',actionType:'publish',domain:'public_web',affectedParties:['public audience'],resourceCommitments:[],obligationsCreated:[],
    disclosures:[{recipient:'public audience',sensitivityLevel:'public',informationScope:['authored piece']}],
    reversibility:{class:'strictly_irreversible',requiresThirdPartyCooperation:true,irreversibleDimensions:['disclosure','reputation','temporal']},
    expectedWorldChanges:['Authored material becomes public and cannot be made historically undisclosed.']
  }
};
