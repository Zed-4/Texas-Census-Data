require 'json'
require 'pathname'

us_counties_geojson_file_path = Pathname.new('./us_counties.json')
texas_counties_geojson_file_path = Pathname.new('./texas_counties.json')

raise 'no file' unless us_counties_geojson_file_path

us_counties_geojson_file = File.open(us_counties_geojson_file_path)
texas_counties_geojson_file = File.open(texas_counties_geojson_file_path, 'w')

us_counties_geojson = JSON.parse(us_counties_geojson_file.read)

us_counties_geojson['features'] = us_counties_geojson['features'].select do |geo_json_feature|
  geo_json_feature['properties']['STATEFP'] == '48'
end

texas_counties_geojson_file.write(
  JSON.dump(us_counties_geojson)
)
