(() => {
  const $ = selector => document.querySelector(selector);
  const dialog = $('#region-dialog');
  let profiles = new Map();
  function openGuide(feature) {
    const p=feature.properties, profile=profiles.get(p.code);
    if (!profile) return;
    $('#dialog-title').textContent=p.name;
    $('#dialog-kicker').textContent='EPA LEVEL III ECOREGION';
    $('#dialog-summary').textContent=profile.distinction;
    $('#dialog-code').textContent=p.code || '—';
    $('#dialog-parent').textContent=titleCase(p.level_ii || 'Not listed');
    $('#dialog-setting').textContent=titleCase(p.level_i || 'Not listed');
    $('#dialog-ecology').textContent=profile.vegetation;
    $('#dialog-soil').textContent=profile.soil;
    const s=profile.stats;
    $('#dialog-climate').textContent=`Annual precipitation: ${s.annualPrecipitationIn} in · mean annual temperature: ${s.annualMeanTempF}°F (PRISM, ${s.temperaturePeriod}). USDA mean annual extreme minimum: ${s.hardinessMeanExtremeMinF}°F, about zone ${s.hardinessZoneFromMean}; the central 80% of mapped values spans roughly zones ${s.hardinessZoneP10}–${s.hardinessZoneP90}.`;
    const plants=plantLabels(profile.vegetation);
    $('#dialog-vegetation-image').src=vegetationIllustration(profile,plants);
    $('#dialog-vegetation-image').alt=`Schematic botanical illustration representing ${p.name}: ${plants.join(', ')}`;
    $('#dialog-image-caption').textContent=`Field sketch · representative plants: ${plants.join(' · ')}`;
    if (!dialog.open) dialog.showModal();
  }
  function plantLabels(text) {
    const clauses=[...text.matchAll(/(?:consists of|includes|include|such as|dominated by)\s+([^.;]+)/gi)]
      .map(match=>match[1]).filter(clause=>clause.split(',').length>1)
      .sort((a,b)=>b.split(',').length-a.split(',').length);
    const list=(clauses[0]||text.split(/[.;]/)[0]).replace(/\b(and|or)\b/gi,',').split(',')
      .map(item=>item.trim().replace(/^(the|some|many|mostly|mainly|primarily|areas of)\s+/i,'').replace(/\s+/g,' '))
      .filter(item=>item.length>3 && item.length<36 && !/\b(vegetation|community|communities|species|regions|forest|forests|grassland|grasslands|shrubland|shrublands|woodland|woodlands|habitats|areas|plants)\b/i.test(item));
    const unique=[];
    for(const item of list) if(!unique.some(x=>x.toLowerCase()===item.toLowerCase())) unique.push(item);
    return unique.slice(0,3).length ? unique.slice(0,3) : ['regional flora','native grasses','woodland plants'];
  }
  function vegetationIllustration(profile,plants) {
    const hue=[...profile.code].reduce((a,c)=>a+c.charCodeAt(0),0)%360;
    const labels=plants.slice(0,3).map((x,i)=>`<text x="${95+i*150}" y="228" text-anchor="middle">${escapeXml(x.slice(0,24))}</text>`).join('');
    const grass=/grass|prairie|steppe|meadow|tussock|sedge|marsh|tundra/i.test(profile.vegetation);
    const desert=/desert|cactus|yucca|agave|succulent|arid|sagebrush/i.test(profile.vegetation);
    const stems=[55,205,355].map((x,i)=>{
      const top=72+(i%2)*18, height=114-(i%2)*12;
      if(grass) return `<path d="M${x} 204 Q${x-5} 151 ${x-28} ${top+8} M${x} 204 Q${x+2} 150 ${x+1} ${top-8} M${x+2} 204 Q${x+5} 156 ${x+31} ${top+7} M${x} 204 Q${x-13} 165 ${x-39} ${top+32} M${x} 204 Q${x+19} 165 ${x+41} ${top+31}"/>`;
      if(desert) return `<path d="M${x} 203 V${top+13} M${x} ${top+55} V${top+34} Q${x-21} ${top+34} ${x-21} ${top+18} M${x} ${top+45} Q${x+23} ${top+45} ${x+23} ${top+23}"/><path d="M${x-34} 202 Q${x-27} 184 ${x-19} 202 M${x+28} 201 Q${x+36} 179 ${x+44} 201"/>`;
      return `<path d="M${x} 202 Q${x-4} 148 ${x} ${top+24}"/><path d="M${x} ${top+52} Q${x-42} ${top+28} ${x-39} ${top+7} Q${x-9} ${top+5} ${x} ${top+35} Q${x+8} ${top+1} ${x+40} ${top+10} Q${x+42} ${top+35} ${x} ${top+52}Z"/><path d="M${x} ${top+36} Q${x-25} ${top+12} ${x-17} ${top-4} Q${x+3} ${top+4} ${x} ${top+36} M${x} ${top+39} Q${x+20} ${top+8} ${x+31} ${top+4} Q${x+33} ${top+24} ${x} ${top+39}"/>`;
    }).join('');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 250"><rect width="420" height="250" fill="#e8e6db"/><path d="M0 188 Q85 168 150 188 T300 185 T420 180 V250 H0Z" fill="hsl(${hue} 23% 76%)"/><g fill="none" stroke="#315642" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${stems}<path d="M25 204 Q35 183 44 204 M380 200 Q389 179 399 202" stroke-width="2"/></g><path d="M0 207 Q110 197 210 207 T420 203" fill="none" stroke="#947747" stroke-width="2"/><g fill="#315642" font-family="sans-serif" font-size="10">${labels}</g><text x="15" y="24" fill="#617365" font-family="monospace" font-size="9" letter-spacing="1.5">REGIONAL FIELD SKETCH · ${profile.code}</text></svg>`;
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }
  function escapeXml(text) { return text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c])); }
  function titleCase(text) { return text.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }
  Promise.all([
    fetch('assets/us-states-10m.json?v=5').then(response => { if(!response.ok) throw Error('Could not load state boundaries'); return response.json(); }),
    fetch('assets/epa-level-iii-us.geojson?v=5').then(response => { if(!response.ok) throw Error('Could not load EPA ecoregions'); return response.json(); }),
    fetch('assets/region-profiles.json?v=6').then(response => { if(!response.ok) throw Error('Could not load regional profiles'); return response.json(); })
  ]).then(([topology, regions, data]) => { profiles=new Map(data.map(profile=>[profile.code,profile])); drawMap(topology, regions); })
    .catch(error => {
      $('#map-count').textContent='Map failed to load';
      const message=$('#map-error');
      if(message) {
        message.hidden=false;
        message.textContent=`The map could not be drawn (${error.message}). Refresh to try again.`;
      }
      console.error('Map setup failed:',error);
    });

  function drawMap(topology, regionData) {
    const svg=d3.select('#national-map'), node=svg.node();
    const width=node.clientWidth || 1040, height=560;
    svg.attr('viewBox',`0 0 ${width} ${height}`).attr('preserveAspectRatio','xMidYMid meet');
    const nation=topojson.feature(topology,topology.objects.nation);
    const states=topojson.feature(topology,topology.objects.states).features;
    const projection=d3.geoAlbersUsa().fitExtent([[12,12],[width-12,height-12]],nation);
    const path=d3.geoPath(projection);
    const colors=new Map([...regionData.features]
      .sort((a,b)=>a.properties.code.localeCompare(b.properties.code,undefined,{numeric:true}))
      .map((feature,index)=>[feature.properties.code,`hsl(${(index*137.508)%360} 43% 77%)`]));
    const defs=svg.append('defs');
    defs.append('clipPath').attr('id','us-clip').append('path').datum(nation).attr('d',path);
    svg.append('path').datum(nation).attr('class','us-land').attr('d',path);
    const visible=regionData.features.filter(f => path(f));
    svg.append('g').attr('clip-path','url(#us-clip)').selectAll('path').data(visible).join('path')
      .attr('class','eco-region').attr('fill',d=>colors.get(d.properties.code))
      .attr('d',path).attr('tabindex','0').attr('role','button')
      .attr('aria-label',d=>`Open ${d.properties.name} ecoregion profile`)
      .on('click',(event,d)=>openGuide(d))
      .on('keydown',(event,d)=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openGuide(d);}})
      .on('pointerenter',(event,d)=>showTooltip(event,d))
      .on('pointermove',(event,d)=>positionTooltip(event))
      .on('pointerleave',hideTooltip);
    svg.append('g').selectAll('path').data(states).join('path').attr('class','state').attr('d',path).attr('pointer-events','none');
    svg.append('path').datum(nation).attr('class','us-outline').attr('d',path).attr('pointer-events','none');
    $('#map-count').textContent=`${new Set(visible.map(f=>f.properties.code)).size} EPA Level III ecoregions`;
  }
  function showTooltip(event,feature) { const tip=$('#map-tooltip');tip.textContent=feature.properties.name;tip.style.display='block';positionTooltip(event); }
  function positionTooltip(event) { const tip=$('#map-tooltip');tip.style.left=`${event.clientX+14}px`;tip.style.top=`${event.clientY+14}px`; }
  function hideTooltip() { $('#map-tooltip').style.display='none'; }
})();
