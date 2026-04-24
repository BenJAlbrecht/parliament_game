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

export function leanLabel(score) {
  if (score <= -5) return 'Far Left';
  if (score <=  -2) return 'Left';
  if (score <   +2) return 'Centre';
  if (score <=  +5) return 'Right';
  return 'Far Right';
}

export function leanCls(score) {
  if (score <= -2) return 'lean-left';
  if (score >=  2) return 'lean-right';
  return 'lean-centre';
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

export const POLICY_SCALES = {
  wages_unions: {
    label: 'Wages & Unions',
    poles: ['No Rights', 'Worker Power'],
    steps: [
      'No minimum wage, unions suppressed',
      'Below living cost minimum, limited union rights',
      'Living wage, basic union recognition',
      'Strong minimum wage, collective bargaining protected',
      'Maximum wage cap, full union rights and worker ownership',
    ],
  },
  market_regulation: {
    label: 'Market Regulation',
    poles: ['Free Market', 'State-Led'],
    steps: [
      'Fully deregulated free market',
      'Light-touch regulation',
      'Mixed economy with oversight',
      'Significant state intervention',
      'State-led, nationalised key industries',
    ],
  },
  public_services: {
    label: 'Public Services',
    poles: ['Privatised', 'Universal'],
    steps: [
      'Fully privatised',
      'Minimal safety net',
      'Basic public provision',
      'Comprehensive public services',
      'Universal provision, free at point of use',
    ],
  },
  fiscal_policy: {
    label: 'Fiscal Policy',
    poles: ['Low Tax', 'Redistribute'],
    steps: [
      'Flat low tax, minimal redistribution',
      'Low progressive taxation',
      'Moderate taxation',
      'High progressive taxation',
      'Heavy redistribution, wealth taxes',
    ],
  },
  border_policy: {
    label: 'Border Policy',
    poles: ['Open Borders', 'Closed'],
    steps: [
      'Open borders, free movement',
      'Liberal immigration, easy entry',
      'Controlled immigration, standard checks',
      'Strict border controls, limited immigration',
      'Closed borders, zero-net migration',
    ],
  },
  social_policy: {
    label: 'Social Policy',
    poles: ['Progressive', 'Traditional'],
    steps: [
      'Fully progressive, liberal social framework',
      'Liberal-leaning social consensus',
      'Moderate social consensus',
      'Conservative-leaning social norms',
      'Traditional values, religious influence on law',
    ],
  },
  foreign_policy: {
    label: 'Foreign Policy',
    poles: ['Multilateral', 'Nationalist'],
    steps: [
      'Deep European integration, multilateral cooperation',
      'Pro-international, active treaty participation',
      'Balanced sovereignty and cooperation',
      'Eurosceptic, national interest first',
      'Nationalist, withdrawn from international obligations',
    ],
  },
  civic_integrity: {
    label: 'Civic Integrity',
    poles: ['Captured', 'Reformed'],
    steps: [
      'Widespread corruption; institutions captured by political interests',
      'Weak accountability; formal oversight exists but is selectively enforced',
      'Mixed: independent institutions emerging, partial transparency',
      'Strong accountability; independent courts, press, and anti-corruption bodies',
      'Full democratic reform; transparent government, proportional representation, citizen oversight',
    ],
  },
};

export const STARTING_POLICY = {
  wages_unions:      2,
  market_regulation: 2,
  public_services:   3,
  fiscal_policy:     2,
  border_policy:     3,
  social_policy:     3,
  foreign_policy:    2,
  civic_integrity:   3,
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
    goals: [
      { id: 'workers_first',    title: 'Workers First',    desc: 'Raise wages & unions to level 3 or above',      check: (ps)     => ps.wages_unions >= 3 },
      { id: 'public_ownership', title: 'Public Ownership', desc: 'Pass 2 or more left-leaning bills this session', check: (ps, st) => st.leftBillsPassed >= 2 },
      { id: 'no_austerity',     title: 'No Austerity',     desc: 'Keep fiscal policy at or above its starting level', check: (ps) => ps.fiscal_policy >= STARTING_POLICY.fiscal_policy },
    ],
    mandates: [
      { id: 'seize_the_means',  title: 'Seize the Means',  desc: 'Raise market regulation AND wages & unions each to level 4 or above.', legislative: true,  check: (ps) => ps.market_regulation >= 4 && ps.wages_unions >= 4 },
      { id: 'no_surrender',     title: 'No Surrender',     desc: 'Complete the session without abstaining on a single turn.',            legislative: false, check: (ps, st) => st.turnsAbstained === 0 },
    ],
    caucuses: [
      { name: 'Revolutionary Caucus', share: 55, desc: 'The founding hardliners. View parliamentary politics as a necessary evil rather than an end in itself. Push for maximum radicalism on every bill, treat compromise as capitulation, and regard coalition partners with open suspicion. The faction that gave the party its combative identity.' },
      { name: 'Green Socialists',     share: 30, desc: 'Emerged from the environmental movement of the 1990s. Want to fuse economic radicalism with ecological transformation — public ownership of energy, a green industrial strategy, and zero-carbon commitments as the non-negotiable core of any left programme. Frequently in tension with the party\'s industrial base.' },
      { name: 'Democratic Assembly',  share: 15, desc: 'The party\'s idealist fringe. Advocate for participatory budgeting, worker councils, and direct democracy as the architecture of a post-capitalist future. As sceptical of state power as of market power — they want power dispersed downward, not merely nationalised upward.' },
    ],
  },
  {
    name: 'Socialist Party',
    color: '#be185d',
    seats: 133,
    economic: -4,
    social: -4,
    ideology: 'center-left',
    coalitions: ['grand', 'left'],
    bio: {
      summary: 'The historic party of organised labour, reformed into a broad progressive coalition.',
      history: 'Founded by trade union leaders at the turn of the twentieth century, the Socialist Party governed for most of the postwar decades and built the modern welfare state. A bruising stint in opposition during the 1990s forced a painful modernisation: the party shed its nationalisation commitments, embraced regulated markets, and repositioned itself as the party of public services and European integration. It remains the largest left-of-centre force, drawing support from public-sector workers, urban professionals, and minority communities.',
    },
    goals: [
      { id: 'welfare_state',    title: 'Welfare State',    desc: 'Raise public services to level 4 or above',            check: (ps)     => ps.public_services >= 4 },
      { id: 'full_programme',   title: 'Full Programme',   desc: 'Pass 6 or more bills this session',                   check: (ps, st) => st.billsPassed >= 6 },
      { id: 'stable_coalition', title: 'Stable Coalition', desc: 'Keep all partner loyalties above 50% by session end', check: (ps, st) => st.allPartnersLoyalAbove50 },
    ],
    mandates: [
      { id: 'build_welfare',  title: 'Build the Welfare State', desc: 'Raise public services to level 4 or above AND pass 5 or more bills.', legislative: true,  check: (ps, st) => ps.public_services >= 4 && st.billsPassed >= 5 },
      { id: 'steady_hand',    title: 'Steady Hand',             desc: 'End the session with all coalition partners above 50% loyalty.',       legislative: false, check: (ps, st) => st.allPartnersLoyalAbove50 },
    ],
    caucuses: [
      { name: 'Old Guard',           share: 45, desc: 'The trade union bloc. Rooted in the postwar welfare settlement and deeply suspicious of markets, they resist any dilution of the party\'s redistributive commitments. Their loyalty is to organised labour first and electoral strategy second. The backbone of the membership; the drag on the modernisers.' },
      { name: 'The Reformists',      share: 35, desc: 'The modernising wing, shaped by years in opposition. Believe electability requires a credible economic platform, pro-European positioning, and distance from the Old Guard\'s class politics. Viewed by the left as the party\'s ongoing identity crisis; view the left as the reason the party keeps losing.' },
      { name: 'Progressive Alliance', share: 20, desc: 'The social liberal insurgency. Less interested in economic redistribution than in rights — gender, race, LGBTQ+, disability, climate. Push the party toward identity-conscious politics and away from its class-based roots, creating friction with both major factions while speaking to a younger urban base.' },
    ],
  },
  {
    name: 'Renewal',
    color: '#F59E0B',
    seats: 83,
    economic: 2,
    social: -5,
    ideology: 'center',
    coalitions: ['left', 'right'],
    bio: {
      summary: 'A technocratic movement promising competence over ideology.',
      history: 'Renewal was founded just twelve years ago by defectors from both the Socialist Party and the Christian Democrats who believed that partisan trench warfare was destroying public trust in government. It surged to prominence on a platform of electoral reform, digital public services, and pro-European centrism. Critics call it a party without a soul; supporters call it the only party without an axe to grind. Its electoral coalition is volatile — urban, educated, and quick to punish perceived betrayal.',
    },
    goals: [
      { id: 'fiscal_responsibility', title: 'Fiscal Responsibility', desc: 'Keep fiscal policy within 1 step of where it started', check: (ps) => Math.abs(ps.fiscal_policy - STARTING_POLICY.fiscal_policy) <= 1 },
      { id: 'broad_mandate',         title: 'Broad Mandate',         desc: 'Pass bills across 4 or more policy domains',           check: (ps, st) => st.domainsPassedCount >= 4 },
      { id: 'active_legislature',    title: 'Active Legislature',    desc: 'Pass 6 or more bills this session',                    check: (ps, st) => st.billsPassed >= 6 },
    ],
    mandates: [
      { id: 'reform_agenda',      title: 'The Reform Agenda',    desc: 'Pass bills across 5 or more distinct policy domains.', legislative: true,  check: (ps, st) => st.domainsPassedCount >= 5 },
      { id: 'competent_govt',     title: 'Competent Government', desc: 'Pass 7 or more bills this session.',                   legislative: false, check: (ps, st) => st.billsPassed >= 7 },
    ],
    caucuses: [
      { name: 'The Mandarins',      share: 50, desc: 'The party\'s founding establishment. Evidence-based, institution-trusting, and firmly pro-European. Believe that competent management of public institutions is more transformative than ideology. The faction that makes Renewal feel like a think-tank that won an election.' },
      { name: 'Pirate Caucus',      share: 30, desc: 'Digital-age radicals inspired by the European Pirate Party movement. Champion open government, algorithmic accountability, net neutrality, and direct democratic participation via digital platforms. Uncomfortable with the party\'s economic centrism, but united with the Technocrats on civil liberties and European integration.' },
      { name: 'Classical Liberals', share: 20, desc: 'The free-market conscience of the party. Pro-European but economically orthodox: lower taxes, deregulation, and individual liberty over state provision. Wary of the Technocrats\' appetite for intervention and quietly hostile to the Pirate Caucus\'s instincts on platform regulation.' },
    ],
  },
  {
    name: 'Christian Democrats',
    color: '#2563A8',
    seats: 145,
    economic: 4,
    social: 5,
    ideology: 'center-right',
    coalitions: ['grand', 'right'],
    bio: {
      summary: 'The dominant party of the postwar era, rooted in Catholic social tradition.',
      history: "The Christian Democrats emerged from the rubble of the Second World War as the guarantors of stability, democracy, and Western alliance. Anchored in Catholic social teaching, the party has always balanced free-market economics with a robust social safety net — suspicious of both socialism and libertarianism. It has led or participated in government for most of the republic's history, making it the natural party of cautious, incremental reform. Its broad church includes rural conservatives, business interests, and religious communities.",
    },
    goals: [
      { id: 'fiscal_discipline',  title: 'Fiscal Discipline',  desc: 'Keep fiscal policy at level 2 or below',             check: (ps)     => ps.fiscal_policy <= 2 },
      { id: 'social_stability',   title: 'Social Stability',   desc: 'Keep social policy at or above its starting level',  check: (ps)     => ps.social_policy >= STARTING_POLICY.social_policy },
      { id: 'governing_majority', title: 'Governing Majority', desc: 'Pass 5 or more bills without abstaining any turn',   check: (ps, st) => st.billsPassed >= 5 && st.turnsAbstained === 0 },
    ],
    mandates: [
      { id: 'sound_finances',   title: 'Sound Finances',    desc: 'Keep both fiscal policy and market regulation at level 2 or below.', legislative: true,  check: (ps) => ps.fiscal_policy <= 2 && ps.market_regulation <= 2 },
      { id: 'governing_party',  title: 'Governing Party',   desc: 'Pass 5 or more bills without abstaining on any turn.',              legislative: false, check: (ps, st) => st.billsPassed >= 5 && st.turnsAbstained === 0 },
    ],
    caucuses: [
      { name: 'Social Catholics',     share: 40, desc: 'The party\'s original soul. Draw on Catholic social teaching to defend both traditional family values and a robust welfare state. Suspicious of pure market liberalism and committed to solidarity. The faction most uncomfortable with the coalition\'s nationalist partners, and the one European allies watch for reassurance.' },
      { name: 'Economic Liberals',    share: 35, desc: 'The business wing. Want lower corporate taxes, a lighter regulatory touch, and a more flexible labour market. Increasingly dominant in the donor base and increasingly in tension with the Social Catholics over welfare spending. See the party\'s future in the boardroom, not the parish hall.' },
      { name: 'National Conservatives', share: 25, desc: 'The Eurosceptic right. Culturally traditional, suspicious of Brussels, and drawn toward the immigration politics of the National Front without quite crossing the threshold. The faction most at risk of defection to nationalist parties — and the one the party\'s centrist partners watch most anxiously.' },
    ],
  },
  {
    name: 'National Front',
    color: '#8B5CF6',
    seats: 70,
    economic: 1,
    social: 9,
    ideology: 'far-right',
    coalitions: ['right'],
    bio: {
      summary: 'A nationalist party surging on anti-immigration sentiment and Euroscepticism.',
      history: 'The National Front spent its first two decades as a pariah — tolerated on the ballot but excluded from every coalition negotiation. That changed when economic stagnation and a series of high-profile immigration controversies pushed it into double digits. The party is ruthlessly disciplined, ideologically rigid, and deeply suspicious of international institutions. It draws support from deindustrialised towns, small-business owners, and younger voters who feel abandoned by the mainstream. Mainstream parties still refuse to govern with it — for now.',
    },
    goals: [
      { id: 'secure_border',     title: 'Secure the Border', desc: 'Raise border policy to level 4 or above',              check: (ps) => ps.border_policy >= 4 },
      { id: 'national_interest', title: 'National Interest', desc: 'Raise foreign policy to level 4 or above',             check: (ps) => ps.foreign_policy >= 4 },
      { id: 'free_market',       title: 'Free Market',       desc: 'Keep market regulation at or below its starting level', check: (ps) => ps.market_regulation <= STARTING_POLICY.market_regulation },
    ],
    mandates: [
      { id: 'national_programme', title: 'The National Programme', desc: 'Raise both border policy AND foreign policy to level 4 or above.', legislative: true,  check: (ps) => ps.border_policy >= 4 && ps.foreign_policy >= 4 },
      { id: 'prove_we_govern',    title: 'Prove We Can Govern',    desc: 'Pass 4 or more bills this session.',                               legislative: false, check: (ps, st) => st.billsPassed >= 4 },
    ],
    caucuses: [
      { name: 'Identitarians',       share: 45, desc: 'The cultural nationalist hardliners. Define the party\'s ideological core: heritage, demographic politics, and uncompromising opposition to immigration and multiculturalism. The faction that kept the NF in electoral purgatory for twenty years — and the one that finally cracked the cordon sanitaire.' },
      { name: 'Economic Nationalists', share: 35, desc: 'The left-populist surprise within the party. Want to protect domestic industry, tax multinationals, raise wages for native workers, and reject free trade as a globalist project. Inconsistent with the Identitarians on welfare but unified on every cultural question. Court the deindustrialised working class the Socialist Party abandoned.' },
      { name: 'Law & Order',         share: 20, desc: 'The authoritarian security wing. Focused on crime, policing, and the expansion of state security powers. Demand tougher sentencing, more police, and a harder line on internal threats. The most comfortable with state power of any NF faction — which puts them in occasional tension with the Economic Nationalists\' anti-establishment instincts.' },
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
      'Socialist Party':  'The Progressive Gamble',
      'Renewal':           'The Indispensable Centre',
    },
    scenarios: {
      "People's Alliance": "A fractured election has delivered the left its best chance in a generation — but not as you planned. The Socialist Party and Renewal both fell short of their targets, and your People's Alliance surged on the back of housing protests and strike action. Without your 35 seats the progressive bloc collapses. For the first time in decades the far-left holds real leverage. The question is how far you can push it.",
      'Socialist Party': "The election returned no majority, but the numbers point left. Your Socialist Party are the largest progressive force, and both Renewal and the People's Alliance have signalled willingness to govern. The right is divided and a grand coalition would cost you your base. A left bloc is within reach — if you can hold three very different parties together through a full term.",
      'Renewal': "Renewal's breakout election — up twelve seats on a technocratic, reform platform — has made you the indispensable voice of the parliamentary left. Neither the Socialist Party nor the People's Alliance can form a government without your 83 seats. You have a mandate to modernise, but your partners have very different ideas about what that means.",
    },
    partnerBlurbs: {
      "People's Alliance": {
        'Socialist Party': "The Socialist Party bring 133 seats and the credibility of a governing party — but they will resist your most radical demands at every turn.",
        'Renewal': "Urban, liberal, and uneasy with your platform — but Renewal's 83 seats are the margin that puts the left in power.",
      },
      'Socialist Party': {
        "People's Alliance": "The far-left's 35 seats are what makes this coalition possible. Principled to the point of self-sabotage — handle carefully.",
        'Renewal': "Your centrist partners bring 83 seats and a reform agenda. Keep them inside the tent and the majority holds.",
      },
      'Renewal': {
        "People's Alliance": "Radical and disciplined, with 35 seats they will not trade lightly. Their support is never guaranteed.",
        'Socialist Party': "The largest partner, 133 seats, with a long tradition of governing. They believe this coalition is theirs to lead — your job is to prove otherwise.",
      },
    },
  },
  {
    id: 'grand',
    name: 'Grand Coalition',
    parties: ['Socialist Party', 'Christian Democrats'],
    titles: {
      'Socialist Party':   'Strange Bedfellows',
      'Christian Democrats': 'Stability at Any Cost',
    },
    scenarios: {
      'Socialist Party': "No bloc won the election outright. Markets are rattled, a budget deadline looms, and the President has called on both major parties to talk. Leading the Socialist Party into a grand coalition means shelving your left-wing programme — but it may be the only way to govern. The Christian Democrats are at the table. The terms are yours to negotiate.",
      'Christian Democrats': "Your party remains the largest in parliament, but the era of single-party government is over. A nationalist surge on your right and a progressive surge on your left have squeezed the centre. A grand coalition with the Socialist Party is the path to stable government — but your own backbenchers are deeply uncomfortable with the price of admission.",
    },
    partnerBlurbs: {
      'Socialist Party': {
        'Christian Democrats': "Your historic rivals, with 145 seats and a very different vision of the country. A necessary partner — but not a comfortable one.",
      },
      'Christian Democrats': {
        'Socialist Party': "The centre-left with 133 seats and a clear price for their cooperation. Coalition discipline will be tested from day one.",
      },
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
    partnerBlurbs: {
      'Renewal': {
        'Christian Democrats': "The dominant force on the right, with 145 seats. They need you more than they will admit — use that leverage.",
        'National Front': "Seventy seats of nationalist energy and a volatile base. Their demands will be your biggest headache.",
      },
      'Christian Democrats': {
        'Renewal': "The liberal centrists with 83 seats, deeply uncomfortable with the National Front in government. Keep them on board or the coalition collapses.",
        'National Front': "Seventy seats of nationalist ambition. They campaigned against your establishment values. Manage this relationship carefully.",
      },
      'National Front': {
        'Christian Democrats': "The Christian Democrats bring institutional legitimacy and 145 seats — but they will try to moderate everything you want to do.",
        'Renewal': "Renewal's 83 seats give the coalition a veneer of centrism. They are uneasy. Keep them in line.",
      },
    },
  },
];

export const ENDINGS = {
  left: {
    "People's Alliance": {
      high: "The historians will argue about this term for decades. You came to parliament not as a governing party but as a conscience — and somehow, that conscience governed. The housing protests that carried the People's Alliance to its surge have legislation attached to them now: real wage floors, the public ownership bill that every other party said was unthinkable. The Socialist Party called you difficult. Renewal called you reckless. The polling tells a different story. The Fringe held the keys, and used them.",
      mid:  "The session is over, and the ledger is mixed. You arrived as a once-in-a-generation opportunity — the far-left with real leverage for the first time in thirty years. Some of it you used well: minimum wage legislation passed, a housing bill survived committee. But the Socialist Party watered down your flagship policies, and Renewal blocked the rest. The protestors who gave you your surge are asking what changed. The answer is: some things. Not enough. The Fringe held the keys — but the doors it opened were narrower than promised.",
      low:  "The term ends in disappointment. For one brief moment the arithmetic favoured you: 35 seats the bloc could not do without, a chance to legislate the demands chanted in the streets. But the coalition proved stronger than your platform. Every radical bill was softened, delayed, or killed by partners who needed your votes but not your agenda. The housing protesters have moved on. The Socialist Party are briefing against you. The Fringe held the keys — and found the locks had been changed.",
      collapse: "The coalition fell before the session could end. Your partners were pushed past the point of no return — the Socialist Party faced a backbench revolt, and Renewal's moderates resigned the coalition whip rather than defend another radical bill. The government lost its majority. An emergency election has been called. The Fringe held the keys and used them once too often. The door has slammed shut.",
    },
    'Socialist Party': {
      high: "A left government should not have worked. The arithmetic was tight, the partners awkward, and the centre was openly sceptical. But you governed. A decade in opposition had sharpened your team and clarified your priorities, and when the moment came you were ready. The public services agenda — healthcare, education, housing — moved forward with rare parliamentary discipline. When the history of this republic is written, this term will sit alongside the postwar years as evidence that social democracy, properly led, can still build things worth keeping.",
      mid:  "The session closes on a verdict of could do better. You came to the left bloc believing you could lead it. In practice, leading it meant constant negotiation — the People's Alliance pulling you left, Renewal threatening to defect whenever a bill looked too interventionist. Some things passed. Some things you are proud of. But the flagship promise — a serious housing programme — was guttered in committee. Your base turned out; they expected more. The Progressive Gamble paid off in government. Whether it paid off in policy is harder to say.",
      low:  "The Progressive Gamble failed to pay out. You formed this government confident that a clear agenda and a working majority would be enough. They were not. Coalition management consumed the energy that should have gone into governing. The People's Alliance extracted concessions you could not sell to the centre. Renewal's reform demands slowed everything else down. The bills that mattered most to your voters — the ones that would have justified three years of opposition — mostly did not survive the session. A left government had its chance. You will be answering for it for the rest of your political life.",
      collapse: "The progressive bloc has broken apart. The strain of holding three parties with three different agendas together finally overwhelmed the coalition. Loyalty fractured, confidence collapsed, and the government fell before the session could complete. An early election is inevitable. You formed this coalition believing that good politics was better than pure politics. What it turned out to be was neither.",
    },
    'Renewal': {
      high: "Renewal came to this coalition with a promise and a problem: 83 seats, a reform mandate, and partners who each wanted to co-opt you. Against all odds, the legislation reflects it. Electoral reform cleared its first reading. The digital public services bill passed. And where your partners tried to drag the government to the extremes, your 83 seats held the line. Indispensable, your critics called you. They meant it as a warning. You turned it into a governing philosophy.",
      mid:  "The indispensable centre proved indispensable in votes, less so in outcomes. You kept the coalition together — that is not nothing. When the People's Alliance threatened to collapse the government over the defence budget, you brokered the compromise. When the Socialist Party rushed an untested nationalisation bill, you slowed it down. But your own priorities — electoral reform, digital infrastructure — ended the term half-finished. Leverage without agenda is just delay. The lesson of this term is one you will not need to learn twice.",
      low:  "Renewal entered this coalition as the indispensable centre and leaves it hollowed out. The votes were there. The reform agenda was not. Every session, the Socialist Party and the People's Alliance treated your 83 seats as ballast rather than direction. Electoral reform was postponed. The digital services bill died in committee. You held the coalition together out of duty to stable government. Your voters are asking whether stable government was the point. A breakout election, a once-in-a-decade opportunity, and the principal achievement is that things could have been worse.",
      collapse: "The coalition has fallen. The centrist glue that held the left bloc together came unstuck — and without Renewal's confidence, the government collapsed mid-session. A snap election has been called. You entered this coalition as the indispensable centre. You leave it having learned what indispensable truly means: not that you cannot be driven out, but that when you go, nothing survives.",
    },
  },
  grand: {
    'Socialist Party': {
      high: "They said it could not hold — a left party governing with its historic rivals. The deal was uncomfortable from day one: shared cabinet seats, competing visions, a coalition agreement dense with compromises. And yet the bills passed. You entered grand coalition knowing you would have to shed parts of your programme; the test was which parts you protected. The welfare floor was not touched. The health spending was not cut. Strange bedfellows make strange history. This term will be debated in party conferences for years — but the voters noticed that parliament functioned.",
      mid:  "The grand coalition governed — which was, perhaps, the ambition. No crisis broke it. The budget passed. The markets stayed calm. But the Socialist Party who vote for you did not sign up for modest adjustments. The Christian Democrats blocked your redistributive agenda at every stage; you blocked their cuts at every stage. What emerged was a government shaped entirely by what both parties refused to do. Not a failure, exactly. But the voters who wanted a left government — who put their faith in your capacity to govern without surrendering — did not get one.",
      low:  "Strange bedfellows, stranger results. You entered the grand coalition believing that governing was better than not governing. A term later, that calculation is harder to defend. Every significant policy initiative was traded away in the agreement or ground down in cabinet. The Christian Democrats used the partnership to stabilise their own position while your base bled support. You shielded the welfare state from the worst. Whether the welfare state was all you were elected to protect is the question your party is now furiously debating.",
      collapse: "The grand coalition did not survive the session. Relations with the Christian Democrats deteriorated beyond repair — loyalty exhausted, cooperation broken — and the partnership meant to demonstrate that the political centre could hold has instead demonstrated the opposite. Parliament is dissolved. Strange bedfellows have parted, and not gently.",
    },
    'Christian Democrats': {
      high: "Stability was the promise, and stability was delivered. In a parliament fragmented by nationalist surges and progressive uprisings, your Christian Democrats provided the anchor the republic needed. The grand coalition was not ideologically comfortable — the Socialist Party pushed left where you would have held firm — but the budget balanced, the rating agencies held steady, and the European commitments were renewed. History will record this as a term of competent, unspectacular governance. Given the alternatives, that is a genuine achievement.",
      mid:  "Stability at any cost — and the cost turned out to be significant. You entered grand coalition to govern responsibly and ended the term defending a programme that satisfied neither your own base nor your partners. The Socialist Party extracted spending commitments your fiscal wing opposed. Your rural conservatives are restless. The republic did not fall apart. Markets did not panic. But your backbenchers are asking a pointed question: what is the party for if governing means becoming indistinguishable from the left?",
      low:  "The price of stability proved higher than the party could afford. Grand coalition was sold to your members as the responsible choice — a mature party putting national interest above partisan preference. What it became was a term of managed retreat: social spending you disagreed with, institutional reforms that weakened your traditional bases, and a legislative record too thin to campaign on. The Socialist Party will recover. Whether the Christian Democrats, their identity blurred by three years of compromise, can say the same is a question the next leadership contest will answer.",
      collapse: "The coalition has failed. The partnership that was supposed to guarantee stability has become its most visible absence — the government collapsed mid-session, loyalty spent, the two major parties unable to sustain the terms of their own agreement. An election follows. Stability at any cost: the cost, it turned out, was stability itself.",
    },
  },
  right: {
    'Renewal': {
      high: "The reformist's dilemma had a reformist's answer. You entered the right bloc knowing that every headline would question your motives and every vote would be scrutinised for ideological contamination. You took it on anyway — because the Christian Democrats offered real concessions and the National Front was manageable if corralled. The electoral reform bill passed. The digital infrastructure programme is funded. Where the National Front tried to push the agenda toward its base, your 83 seats held the line. The dilemma, it turns out, was not whether to enter. It was whether you could shape what came next. You did.",
      mid:  "The reformist's dilemma was never resolved — it was managed, vote by vote. Renewal calculated that influence inside the coalition was worth the reputational cost. In parts it was: some liberalising reforms passed, the National Front's more extreme demands were blocked. But the electoral reform package — the foundation stone of Renewal's entire project — ended the term incomplete. Your urban voters stuck with you, barely. The next election will test whether we could have been much worse is a governing philosophy. You suspect it is not.",
      low:  "The reformist's dilemma ended as dilemmas often do: unresolved and costly. Renewal's calculation was that coalition with the right was better than opposition, that real influence was worth the association. The association proved more durable than the influence. The National Front set the agenda; the Christian Democrats managed the economy for their own constituency; Renewal was left defending decisions it never made to voters who feel betrayed. The electoral reform programme — the reason the party exists — did not pass. The question of what Renewal is for, never fully answered, is now urgent.",
      collapse: "The right bloc has fractured. Renewal's presence was meant to moderate the coalition and deliver the reform agenda. Instead, discipline collapsed before either goal was achieved. The government has fallen mid-session. You walked into this coalition with your principles and your leverage. The coalition consumed both.",
    },
    'Christian Democrats': {
      high: "The devil, as it turned out, could be managed. You entered the term knowing that coalition with the National Front would redefine your party in ways that could not be undone. You made that choice anyway — and survived it with something to show. The budget is balanced. The European commitments held. And the National Front, corralled by Renewal on one side and your own party discipline on the other, did not get the nativist legislation it came to parliament to pass. The Christian Democrats have paid the price of stability before. The country got value for it this time.",
      mid:  "The bargain was made, and the bargain was costly. You led the right bloc into government promising to be the moderating force — to take the National Front's seats without taking their agenda. Partially true. The worst of their programme was blocked. But the bills that passed still moved the country rightward in ways your tradition did not authorise. The National Front will claim credit for anything popular while blaming you for everything that was not. That is the nature of bargains with the devil: he keeps better records than you do.",
      low:  "The bargain turned out to be mostly devil. You led the Christian Democrats into coalition with the National Front believing your party's institutional weight would define the government. It did not. The National Front's message discipline meant the coalition looked like their government more than yours. What you blocked, no one remembered. What passed will bear your signature. Your European partners have been pointed in their silence. Your own backbenchers are asking whether a term in opposition would have been less damaging. The answer may be yes.",
      collapse: "The right bloc has collapsed. The three-party coalition proved too fractured to sustain — loyalty exhausted, confidence withdrawn, the parliamentary session ending in dissolution rather than legislation. The Christian Democrats must now face an election as the party that brought the National Front into government and still could not make it work. That is a difficult story to tell.",
    },
    'National Front': {
      high: "They said it would never happen — and then it happened, and then it worked. The Long March to Power ends not in the corridors but in the cabinet room, with legislation bearing your signature for the first time in the republic's history. The programme was not everything your voters demanded; the Christian Democrats and Renewal blocked the full platform. But border controls were strengthened. Cultural conservatism moved from the fringes to the statute book. Two decades of exclusion, and now this: proof that the mainstream cannot hold the door closed indefinitely. The long march ends here. The question is what comes next.",
      mid:  "The long march reached government, if not power. The National Front entered coalition — the historic breakthrough, the moment the cordon sanitaire finally cracked — and found that entering government is not the same as governing. The Christian Democrats controlled the treasury. Renewal controlled the optics. Your most significant demands were either watered down in negotiation or killed in committee by partners who needed your votes but not your agenda. Your base sees the flag in the window. Whether the window opens is another matter. The march continues.",
      low:  "The long march reached its destination and found it empty. After twenty years of being locked out, the National Front finally sat in coalition — and spent the term being managed, moderated, and sidelined by partners who let you join to stabilise their own positions. The most important demands of your voters — meaningful border restrictions, the cultural legislation, the pullback from European integration — were blocked, postponed, or diluted beyond recognition. The Christian Democrats will point to your presence to explain unpopular decisions. Renewal will point to your presence to explain their broken promises. The cordon sanitaire is gone. A new kind of trap has taken its place.",
      collapse: "The government has fallen before you could deliver. After two decades of exclusion, the National Front finally entered coalition — and watched it collapse under the weight of irreconcilable partners. Coalition discipline failed; the loyalty of those who needed you frayed faster than expected. The session ends in dissolution rather than legislation. The long march reached the palace. The doors closed before you could change anything inside.",
    },
  },
};

export const BILLS = [
  // wages_unions — both directions, full score range
  { title: 'Raise the minimum wage',                      type: 'economic', score:  -5, dimension: 'wages_unions',      delta: +1 },
  { title: 'Expand collective bargaining rights',         type: 'economic', score:  -4, dimension: 'wages_unions',      delta: +1 },
  { title: 'Introduce productivity-linked pay floors',    type: 'economic', score:  +2, dimension: 'wages_unions',      delta: +1 },
  { title: 'Restrict strike action in essential services',type: 'social',   score:  +6, dimension: 'wages_unions',      delta: -1 },
  { title: 'Repeal union recognition law',                type: 'economic', score:  +8, dimension: 'wages_unions',      delta: -1 },

  // market_regulation — both directions, full score range
  { title: 'Nationalise the energy sector',               type: 'economic', score:  -7, dimension: 'market_regulation', delta: +1 },
  { title: 'Expand antitrust enforcement',                type: 'economic', score:  -3, dimension: 'market_regulation', delta: +1 },
  { title: 'Introduce consumer protection standards',     type: 'economic', score:  -1, dimension: 'market_regulation', delta: +1 },
  { title: 'Deregulate financial markets',                type: 'economic', score:  +7, dimension: 'market_regulation', delta: -1 },
  { title: 'Privatize postal service',                    type: 'economic', score:  +8, dimension: 'market_regulation', delta: -1 },

  // public_services — both directions, full score range
  { title: 'Expand healthcare coverage',                  type: 'economic', score:  -5, dimension: 'public_services',   delta: +1 },
  { title: 'Fund public education',                       type: 'economic', score:  -4, dimension: 'public_services',   delta: +1 },
  { title: 'Expand rural broadband',                      type: 'economic', score:  -1, dimension: 'public_services',   delta: +1 },
  { title: 'Means-test welfare benefits',                 type: 'economic', score:  +4, dimension: 'public_services',   delta: -1 },
  { title: 'Introduce school voucher programme',          type: 'economic', score:  +6, dimension: 'public_services',   delta: -1 },

  // fiscal_policy — both directions, full score range
  { title: 'Introduce a wealth tax',                      type: 'economic', score:  -7, dimension: 'fiscal_policy',     delta: +1 },
  { title: 'Raise income tax on high earners',            type: 'economic', score:  -4, dimension: 'fiscal_policy',     delta: +1 },
  { title: 'Expand working family tax credits',           type: 'economic', score:  -1, dimension: 'fiscal_policy',     delta: +1 },
  { title: 'Cut corporate tax rate',                      type: 'economic', score:  +6, dimension: 'fiscal_policy',     delta: -1 },
  { title: 'Abolish inheritance tax',                     type: 'economic', score:  +6, dimension: 'fiscal_policy',     delta: -1 },

  // border_policy — both directions, full score range
  { title: 'Expand legal migration pathways',             type: 'social',   score:  -5, dimension: 'border_policy',     delta: -1 },
  { title: 'Abolish visa restrictions with treaty nations',type: 'social',  score:  -3, dimension: 'border_policy',     delta: -1 },
  { title: 'Introduce points-based immigration system',   type: 'social',   score:  +2, dimension: 'border_policy',     delta: +1 },
  { title: 'Tighten border controls',                     type: 'social',   score:  +7, dimension: 'border_policy',     delta: +1 },
  { title: 'Establish a national deportation scheme',     type: 'social',   score:  +9, dimension: 'border_policy',     delta: +1 },

  // social_policy — both directions (−1=Progressive, +1=Traditional), full range
  { title: 'Legalize cannabis nationwide',                type: 'social',   score:  -6, dimension: 'social_policy',     delta: -1 },
  { title: 'Decriminalise drug possession',               type: 'social',   score:  -4, dimension: 'social_policy',     delta: -1 },
  { title: 'Strengthen civil liberties protections',      type: 'social',   score:  -2, dimension: 'social_policy',     delta: -1 },
  { title: 'Restrict abortion access',                    type: 'social',   score:  +7, dimension: 'social_policy',     delta: +1 },
  { title: 'Introduce religious exemptions in civil law', type: 'social',   score:  +6, dimension: 'social_policy',     delta: +1 },

  // foreign_policy — both directions (−1=Multilateral, +1=Nationalist), full range
  { title: 'Deepen European integration',                 type: 'social',   score:  -6, dimension: 'foreign_policy',    delta: -1 },
  { title: 'Join international climate framework',        type: 'social',   score:  -4, dimension: 'foreign_policy',    delta: -1 },
  { title: 'Ratify international human rights protocols', type: 'social',   score:  -2, dimension: 'foreign_policy',    delta: -1 },
  { title: 'Increase defense spending',                   type: 'social',   score:  +5, dimension: 'foreign_policy',    delta: +1 },
  { title: 'Impose import tariffs on foreign goods',      type: 'economic', score:  +3, dimension: 'foreign_policy',    delta: +1 },
  { title: 'Withdraw from international court jurisdiction', type: 'social', score: +7, dimension: 'foreign_policy',    delta: +1 },

  // civic_integrity — both directions, full score range
  { title: 'Anti-Corruption Commission Act',              type: 'social',   score:  -4, dimension: 'civic_integrity',   delta: +1 },
  { title: 'Electoral Reform and Proportional Vote',      type: 'social',   score:  -3, dimension: 'civic_integrity',   delta: +1 },
  { title: 'Lobbying transparency register',              type: 'social',   score:  -2, dimension: 'civic_integrity',   delta: +1 },
  { title: 'Emergency Executive Powers Act',              type: 'social',   score:  +6, dimension: 'civic_integrity',   delta: -1 },
  { title: 'Repeal judicial review powers',               type: 'social',   score:  +7, dimension: 'civic_integrity',   delta: -1 },
];
