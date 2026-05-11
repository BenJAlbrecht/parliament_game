export function econLabel(n) {
  if (n <= -4) return 'State-Led';
  if (n <=  3) return 'Mixed Economy';
  return 'Free Market';
}

export function socialLabel(n) {
  if (n <= -4) return 'Progressive';
  if (n <=  4) return 'Moderate';
  return 'Traditional';
}


const LOGO_FILES = {
  "People's Alliance":  'logo-pa',
  'Socialist Party':    'logo-sp',
  'Renewal':            'logo-r',
  'Christian Democrats':'logo-cd',
  'National Front':     'logo-nf',
};
export function logoSrc(partyName) {
  return `/images/party_logos/${LOGO_FILES[partyName]}.svg`;
}

export const LAYOUT = {
  centerX: 340,
  centerY: 310,
  radiusInner: 110,
  radiusOuter: 280,
  rows: 8,
};






export const PARTIES = [
  {
    name: "People's Alliance",
    color: '#991B1B',
    seats: 35,
    economic: -9,
    social: -7,
    ideology: 'far-left',
    coalitions: ['left'],
    bio: {
      summary: 'A radical party of workers, students, and activists demanding systemic change.',
      history: "Born from the labour strikes and campus uprisings of the early 1970s, the People's Alliance has spent decades on the fringes of parliament — principled, combative, and perpetually outgunned. It champions full public ownership of utilities, a maximum wage, and unilateral disarmament. Coalition partners have always found it difficult; the party itself considers compromise a form of surrender. Its small caucus punches above its weight through protest, obstruction, and the occasional surprise defection that tips a vote.",
    },
    caucuses: [
      { name: 'Democratic Road',    share: 55, desc: 'The movement\'s majority alliance of Marxists and reformists, committed to the electoral path to socialism.' },
      { name: 'Eco-Socialists',     share: 30, desc: 'Environmentalists who see the climate crisis as inseparable from capitalism, fighting for a Green transition led by democratic workplaces.' },
      { name: 'Commune Federation', share: 15, desc: 'Community organizers focusing on building local power through mutual aid and neighborhood assemblies, who believe revolutionary change is only possible from the ground up.' },
    ],
  },
  {
    name: 'Socialist Party',
    color: '#be185d',
    seats: 133,
    economic: -4,
    social: -1,
    ideology: 'center-left',
    coalitions: ['grand', 'left'],
    bio: {
      summary: 'The historic party of organised labour, reformed into a broad progressive coalition.',
      history: 'Founded by trade union leaders at the turn of the twentieth century, the Socialist Party governed for most of the postwar decades and built the modern welfare state. A bruising stint in opposition during the 1990s forced a painful modernisation: the party shed its nationalisation commitments, embraced regulated markets, and repositioned itself as the party of public services and European integration. It remains the largest left-of-centre force, drawing support from public-sector workers, urban professionals, and minority communities.',
    },
    caucuses: [
      { name: 'Old Guard',     share: 45, desc: 'The trade union bloc. Rooted in the postwar welfare settlement and suspicious of markets, they resist any dilution of the party\'s redistributive agenda.' },
      { name: 'New Way',       share: 35, desc: 'The modernising wing, shaped by years in opposition and spearheaded by the New Middle think-tank. Open to market reforms to outflank the right and ensure a left majority.' },
      { name: 'Progressives',  share: 20, desc: 'The social liberal insurgency, based in the professional-managerial class. Indifferent to redistribution, focused on rights — gender, race, LGBTQ+, disability, climate.' },
    ],
  },
  {
    name: 'Renewal',
    color: '#F59E0B',
    seats: 83,
    economic: 1,
    social: -1,
    ideology: 'center',
    coalitions: ['left', 'right'],
    bio: {
      summary: 'A technocratic movement promising competence over ideology.',
      history: 'Renewal was founded just twelve years ago by defectors from both the Socialist Party and the Christian Democrats who believed that partisan trench warfare was destroying public trust in government. It surged to prominence on a platform of electoral reform, digital public services, and pro-European centrism. Critics call it a party without a soul; supporters call it the only party without an axe to grind. Its electoral coalition is volatile — urban, educated, and quick to punish perceived betrayal.',
    },
    caucuses: [
      { name: 'Technocrats',        share: 50, desc: 'The party\'s founding establishment. Evidence-based, institution-trusting, and firmly pro-European.' },
      { name: 'Classical Liberals', share: 30, desc: 'The free-market conscience of the party. Pro-European but economically orthodox: lower taxes, deregulation, and individual liberty over state provision.' },
      { name: 'Pirate Caucus',      share: 20, desc: 'Digital-age radicals inspired by the European Pirate Party movement. Focused on open government, algorithmic accountability, net neutrality, and direct democracy.' },
    ],
  },
  {
    name: 'Christian Democrats',
    color: '#2563A8',
    seats: 145,
    economic: 2,
    social: 2,
    ideology: 'center-right',
    coalitions: ['grand', 'right'],
    bio: {
      summary: 'The dominant party of the postwar era, rooted in Catholic social tradition.',
      history: "The Christian Democrats emerged from the rubble of the Second World War as the guarantors of stability, democracy, and Western alliance. Anchored in Catholic social teaching, the party has always balanced free-market economics with a robust social safety net — suspicious of both socialism and libertarianism. It has led or participated in government for most of the republic's history, making it the natural party of cautious, incremental reform. Its broad church includes rural conservatives, business interests, and religious communities.",
    },
    caucuses: [
      { name: 'Social Catholics',       share: 40, desc: 'The soul of the party. Defenders of Catholic social teaching, traditional family values, and a robust welfare state.' },
      { name: 'Business Wing',          share: 35, desc: 'Voice of the haute bourgeoisie seeking lower taxes, lighter regulation, and a more flexible labor market. Increasingly dominant in party fundraising.' },
      { name: 'National Conservatives', share: 25, desc: 'The Eurosceptic Right. Culturally traditional and drawn to the immigration politics of the National Front.' },
    ],
  },
  {
    name: 'National Front',
    color: '#8B5CF6',
    seats: 70,
    economic: 5,
    social: 9,
    ideology: 'far-right',
    coalitions: ['right'],
    bio: {
      summary: 'A nationalist party surging on anti-immigration sentiment and Euroscepticism.',
      history: 'The National Front spent its first two decades as a pariah — tolerated on the ballot but excluded from every coalition negotiation. That changed when economic stagnation and a series of high-profile immigration controversies pushed it into double digits. The party is ruthlessly disciplined, ideologically rigid, and deeply suspicious of international institutions. It draws support from deindustrialised towns, small-business owners, and younger voters who feel abandoned by the mainstream. Mainstream parties still refuse to govern with it — for now.',
    },
    caucuses: [
      { name: 'Identitarians',   share: 45, desc: 'Nationalist hardliners who define the party\'s ideology: heritage, demographic politics, and uncompromising opposition to immigration and multiculturalism.' },
      { name: 'New Mensheviks',  share: 35, desc: 'Traditional leftists disillusioned with the People\'s Alliance, seeking to fuse the legacy of the fallen Menshevik Soviet Republic with identitarian values.' },
      { name: 'Popular Voice',   share: 20, desc: 'Hostile to elite consensus and the existing social order. A grassroots movement unified by shock jocks and fringe online communities.' },
    ],
  },
];

export const COALITIONS = [
  {
    id: 'left',
    name: 'Left Bloc',
    parties: ["People's Alliance", 'Socialist Party', 'Renewal'],
    titles: {
      "People's Alliance": 'The Fringe Holds the Keys',
      'Socialist Party':  'The Popular Front',
      'Renewal':           'The Indispensable Centre',
    },
    scenarios: {
      "People's Alliance": "The election has delivered the left its best chance in a generation. The Socialists & Center both fell short of their targets. Backed by popular student & housing protests, the People's Alliance is decisive in the progressive bloc. Be realistic, demand the impossible.",
      'Socialist Party': "With the National Front on the move, progressive forces must unite to stop fascism. The election returned no majority, but the numbers point left, and both Renewal and the People's Alliance are willing to govern. As the largest progressive party, only the Socialists can broker the coalition.",
      'Renewal': "Renewal's breakout election — up twelve seats on a technocratic, reform platform — has made you the indispensable voice of the parliamentary left. Neither the Socialist Party nor the People's Alliance can form a government without your 83 seats. You have a mandate to modernise, but your partners have very different ideas about what that means.",
    },
  },
  {
    id: 'grand',
    name: 'Grand Coalition',
    parties: ['Socialist Party', 'Christian Democrats'],
    titles: {
      'Socialist Party':   'Hold the Line',
      'Christian Democrats': 'Stability at Any Cost',
    },
    scenarios: {
      'Socialist Party': "No bloc won the election outright, and the Republic is surrounded by extremes on left and right. The rightist traitors in Renewal refuse to cooperate, and the Christian Democrats are at the table. To defend the welfare state and democracy, we must work with our historic rival.",
      'Christian Democrats': "Your party remains the largest in parliament, but the era of single-party government is over. A nationalist surge on your right and a progressive surge on your left have squeezed the centre. A grand coalition with the Socialist Party is the path to stable government — but your own backbenchers are deeply uncomfortable with the price of admission.",
    },
  },
  {
    id: 'right',
    name: 'Right Bloc',
    parties: ['Renewal', 'Christian Democrats', 'National Front'],
    titles: {
      'Renewal':            "The Reformist's Dilemma",
      'Christian Democrats': "The Devil's Bargain",
      'National Front':      'The Long March to Power',
    },
    scenarios: {
      'Renewal': "You ran on reforming the system — and the system has handed you an unexpected role. The right-wing bloc needs your 83 seats to govern, and both the Christian Democrats and the National Front are bidding for your support. You can extract real concessions — but every move you make in this coalition will define whether Renewal is a genuine reformist force or a useful prop for the right.",
      'Christian Democrats': "The right has its numbers, but unity is fragile. The National Front's surge has made them an unavoidable coalition partner — a decision that will define your party's identity for a generation. Renewal provides a centrist buffer. Whether you can keep these factions aligned through a full term is another question entirely.",
      'National Front': "They said it would never happen. After two decades of being locked out of coalition talks, the National Front has forced itself through the door. The Christian Democrats and Renewal have come to the table — for now. Your voters want radical change. Your partners want stability. Every vote will be a negotiation.",
    },
  },
];

export const BILLS = [
  {
    id: 'public_investment_act',
    name: 'Public Investment Act',
    description: 'A flagship programme of direct state investment in infrastructure, housing, and green energy. Financed by sustained deficit spending over the parliamentary term.',
    category: 'Fiscal Expansion',
    position: { economic: -6, social: 0 },
    effects: { G_path_delta: 20 },
  },
  {
    id: 'stimulus_package',
    name: 'Stimulus Package',
    description: 'An emergency one-off injection of public funds to revive demand during periods of stagnation. Short-term relief, not a structural fix.',
    category: 'Fiscal Expansion',
    position: { economic: -4, social: 0 },
    effects: { G_path_one_shot: 30 },
  },
  {
    id: 'wealth_tax',
    name: 'Wealth Tax',
    description: "An annual levy on net assets above a high threshold, designed to reduce inequality and raise revenue. Contested by the business community and fiercely popular on the left.",
    category: 'Tax',
    position: { economic: -7, social: 2 },
    effects: { tax_rate_delta: 0.02 },
  },
  {
    id: 'tax_cut',
    name: 'Tax Cut',
    description: 'A broad reduction in income and corporate tax rates, intended to stimulate private investment and consumer spending. The perennial demand of the business lobby.',
    category: 'Tax',
    position: { economic: 6, social: 0 },
    effects: { tax_rate_delta: -0.02 },
  },
  {
    id: 'fiscal_discipline_act',
    name: 'Fiscal Discipline Act',
    description: 'A statutory cap on annual public expenditure, requiring departments to operate within a tightened budget envelope. Popular with bond markets; unpopular in the cabinet room.',
    category: 'Fiscal Contraction',
    position: { economic: 7, social: -1 },
    effects: { G_path_delta: -15 },
  },
  {
    id: 'industrial_subsidies',
    name: 'Industrial Subsidies',
    description: "Strategic grants and procurement guarantees for domestic manufacturing, shoring up employment in the nation's industrial heartlands while nudging the long-run growth path.",
    category: 'Structural',
    position: { economic: -3, social: -2 },
    effects: { G_path_delta: 15, g_boost: 0.0005 },
  },
  {
    id: 'labor_market_reform',
    name: 'Labour Market Reform',
    description: 'Measures to increase workforce flexibility and reduce structural unemployment through deregulation, active placement services, and reformed benefit conditionality.',
    category: 'Structural',
    position: { economic: 4, social: 0 },
    effects: { u_heal: 0.005 },
  },
  {
    id: 'infrastructure_invest',
    name: 'Infrastructure Investment',
    description: 'A long-term programme of public works — roads, rail, broadband, and grid upgrades — to raise the productive capacity of the economy without expanding the recurring budget.',
    category: 'Structural',
    position: { economic: -2, social: 0 },
    effects: { g_boost: 0.001 },
  },
  {
    id: 'education_initiative',
    name: 'Education Initiative',
    description: 'Increased funding for schools, vocational training, and universities, with the dual aim of reducing structural unemployment and boosting long-run productivity growth.',
    category: 'Structural',
    position: { economic: -4, social: 3 },
    effects: { g_boost: 0.0008, u_heal: 0.003 },
  },
  {
    id: 'trade_liberalization',
    name: 'Trade Liberalisation',
    description: 'The removal of tariffs and non-tariff barriers to integrate the economy more deeply into global supply chains, raising export competitiveness and potential output.',
    category: 'Structural',
    position: { economic: 5, social: 0 },
    effects: { g_boost: 0.0007 },
  },
];
