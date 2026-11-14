(() => {
  const ecoregionUrl = 'assets/epa-ecoregion-3.geojson';
  const topoUrl = 'assets/us-states-10m.json';
  const $ = (s) => document.querySelector(s);
  function activate() {
    $('#guide-hint').textContent = 'Click the shaded region on either map to inspect the profile';
    document.querySelectorAll('.ecoregion,.locator').forEach(el => {
      el.addEventListener('click', () => {
        $('#field-guide').scrollIntoView({behavior:'smooth',block:'start'});
        $('#guide-hint').textContent = 'EPA Level III Ecoregion 3 · Willamette Valley';
      });
      el.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); el.dispatchEvent(new Event('click')); }
      });
    });
  }
  Promise.all([fetch(topoUrl).then(r => {if(!r.ok) throw Error('states'); return r.json()}), fetch(ecoregionUrl).then(r => {if(!r.ok) throw Error('ecoregion'); return r.json()})])
    .then(([topology, regionData]) => {
      const states = topojson.feature(topology, topology.objects.states);
      const nation = topojson.feature(topology, topology.objects.nation);
      const region = regionData.features[0];
      drawNational(states, nation, region);
      drawRegional(states, region);
      activate();
    }).catch(err => {
      document.querySelectorAll('.map-card').forEach(el => { const msg=document.createElement('p'); msg.textContent='Map data could not be loaded. The field guide and sources remain available below.'; msg.className='small-note'; el.append(msg); });
      console.error(err);
    });
  function drawNational(states,nation,region){
    const svg=d3.select('#national-map'), w=svg.node().clientWidth || 600, h=300;
    svg.attr('viewBox',`0 0 ${w} ${h}`);
    const projection=d3.geoAlbersUsa().fitExtent([[8,7],[w-8,h-7]],nation), path=d3.geoPath(projection);
    svg.append('path').datum(nation).attr('class','nation-outline').attr('d',path);
    svg.append('g').selectAll('path').data(states.features).join('path').attr('class','state').attr('d',path);
    svg.append('path').datum(region).attr('class','ecoregion').attr('tabindex','0').attr('role','button').attr('aria-label','Open Willamette Valley ecoregion field guide').attr('d',path);
    const point=projection(d3.geoCentroid(region));
    if(point) svg.append('circle').attr('class','locator').attr('cx',point[0]).attr('cy',point[1]).attr('r',5).attr('tabindex','0').attr('role','button').attr('aria-label','Open Willamette Valley field guide');
  }
  function drawRegional(states,region){
    const svg=d3.select('#regional-map'), w=svg.node().clientWidth || 600,h=300;
    svg.attr('viewBox',`0 0 ${w} ${h}`);
    const projection=d3.geoMercator().fitExtent([[20,14],[w-20,h-14]],region),path=d3.geoPath(projection);
    svg.append('g').selectAll('path').data(states.features).join('path').attr('class','state').attr('d',path);
    svg.append('path').datum(region).attr('class','ecoregion').attr('tabindex','0').attr('role','button').attr('aria-label','Open Willamette Valley ecoregion field guide').attr('d',path);
  }
})();
