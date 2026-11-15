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
    const photo=profile.image, image=$('#dialog-vegetation-image'), imageFigure=$('.vegetation-figure');
    imageFigure.hidden=!photo;
    if(photo) {
      image.src=photo.src;
      image.alt=photo.alt || `Vegetation photograph associated with ${p.name}`;
      $('#dialog-image-caption').textContent=photo.title;
      $('#dialog-photo-author').textContent=photo.artist;
      const license=$('#dialog-photo-license');license.textContent=photo.license;license.href=photo.licenseUrl || photo.sourceUrl;
      $('#dialog-photo-source').href=photo.sourceUrl;
    }
    if (!dialog.open) dialog.showModal();
  }
  function titleCase(text) { return text.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()); }
  Promise.all([
    fetch('assets/us-states-10m.json?v=5').then(response => { if(!response.ok) throw Error('Could not load state boundaries'); return response.json(); }),
    fetch('assets/epa-level-iii-us.geojson?v=5').then(response => { if(!response.ok) throw Error('Could not load EPA ecoregions'); return response.json(); }),
    fetch('assets/region-profiles.json?v=8').then(response => { if(!response.ok) throw Error('Could not load regional profiles'); return response.json(); })
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
