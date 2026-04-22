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
  },
  {
    name: 'Socialist Party',
    color: '#EC4899',
    seats: 133,
    economic: -4,
    social: -4,
    ideology: 'center-left',
    coalitions: ['grand', 'left'],
    bio: {
      summary: 'The historic party of organised labour, reformed into a broad progressive coalition.',
      history: 'Founded by trade union leaders at the turn of the twentieth century, the Socialist Party governed for most of the postwar decades and built the modern welfare state. A bruising stint in opposition during the 1990s forced a painful modernisation: the party shed its nationalisation commitments, embraced regulated markets, and repositioned itself as the party of public services and European integration. It remains the largest left-of-centre force, drawing support from public-sector workers, urban professionals, and minority communities.',
    },
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
      history: 'The Christian Democrats emerged from the rubble of the Second World War as the guarantors of stability, democracy, and Western alliance. Anchored in Catholic social teaching, the party has always balanced free-market economics with a robust social safety net — suspicious of both socialism and libertarianism. It has led or participated in government for most of the republic\'s history, making it the natural party of cautious, incremental reform. Its broad church includes rural conservatives, business interests, and religious communities.',
    },
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
    flagships: {
      "People's Alliance": [
        { title: 'Nationalise the energy sector',                  type: 'economic', score: -8 },
        { title: 'Cap executive pay at ten times the median wage', type: 'economic', score: -9 },
        { title: 'Universal rent control act',                     type: 'economic', score: -7 },
      ],
      'Socialist Party': [
        { title: 'National housing construction programme',        type: 'economic', score: -6 },
        { title: 'Nationalise the national rail network',          type: 'economic', score: -7 },
        { title: 'Universal free university tuition',              type: 'economic', score: -5 },
      ],
      'Renewal': [
        { title: 'Electoral reform and proportional representation', type: 'social',   score: -4 },
        { title: 'Digital public services modernisation act',        type: 'economic', score: -1 },
        { title: 'Independent anti-corruption commission',           type: 'social',   score: -3 },
      ],
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
    flagships: {
      'Socialist Party': [
        { title: 'Expand mental health services nationwide',       type: 'economic', score: -5 },
        { title: 'Public housing fund for low earners',            type: 'economic', score: -4 },
        { title: 'Raise the minimum wage to a living wage',        type: 'economic', score: -5 },
      ],
      'Christian Democrats': [
        { title: 'Balanced budget consolidation act',              type: 'economic', score: +3 },
        { title: 'Pension system modernisation',                   type: 'economic', score: +4 },
        { title: 'Renew European defence commitments',             type: 'social',   score: +5 },
      ],
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
    flagships: {
      'Renewal': [
        { title: 'Electoral reform and proportional representation', type: 'social',   score: -4 },
        { title: 'Open markets free trade agreement',                type: 'economic', score: +3 },
        { title: 'Independent anti-corruption commission',           type: 'social',   score: -3 },
      ],
      'Christian Democrats': [
        { title: 'Business tax reform and investment package',       type: 'economic', score: +5 },
        { title: 'Pension system modernisation',                     type: 'economic', score: +4 },
        { title: 'Border security enhancement act',                  type: 'social',   score: +6 },
      ],
      'National Front': [
        { title: 'Strict immigration and border controls act',       type: 'social',   score: +8 },
        { title: 'Withdrawal from European treaty obligations',      type: 'social',   score: +7 },
        { title: 'National industry and jobs protection act',        type: 'economic', score: +2 },
      ],
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
  { title: 'Fund public transit expansion', type: 'economic', score: -3 },
  { title: 'Raise the minimum wage',        type: 'economic', score: -5 },
  { title: 'Cut corporate tax rate',        type: 'economic', score: +6 },
  { title: 'Ratify climate accord',         type: 'social',   score: -4 },
  { title: 'Expand healthcare coverage',    type: 'economic', score: -5 },
  { title: 'Tighten border controls',       type: 'social',   score: +7 },
  { title: 'Invest in renewable energy',    type: 'economic', score: -3 },
  { title: 'Deregulate financial markets',  type: 'economic', score: +7 },
  { title: 'Fund public education',         type: 'economic', score: -4 },
  { title: 'Increase defense spending',     type: 'social',   score: +4 },
  { title: 'Legalize cannabis nationwide',  type: 'social',   score: -6 },
  { title: 'Reform the tax code',           type: 'economic', score: +2 },
  { title: 'Ban single-use plastics',       type: 'social',   score: -3 },
  { title: 'Expand rural broadband',        type: 'economic', score: -1 },
  { title: 'Privatize postal service',      type: 'economic', score: +8 },
];
