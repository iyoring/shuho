const { asset, dest, port } = require('bulbo')

const { join, dirname, relative } = require('path')
const accumulate = require('vinyl-accumulate')
const rename = require('gulp-rename')
const remark = require('gulp-remark')
const layout1 = require('layout1')
const branch = require('branch-pipe')
const data = require('gulp-data')
const moment = require('moment')
const frontmatter = require('gulp-front-matter')

const paths = {
  index: 'index.html',
  dest: 'build'
}

const langIcon = {
  en: '🇬🇧',
  ja: '🇯🇵'
}

const sort = (x, y) => y.data.date.diff(x.data.date)
const getBasepath = path => join('.', relative(dirname(path), ''))
const DATE_FORMAT = 'M/D'
const SITE_TITLE = '@kt3k の週報 | Weekly report of @kt3k'
const SITE_DESCRIPTION = '@kt3k の週報です | Weekly report of @kt3k'
const DOMAIN = 'shuho.kt3k.org'

const tmpl = tmpl =>
  layout1.nunjucks(tmpl, { data: { SITE_TITLE, SITE_DESCRIPTION, DOMAIN } })
const acc = () => accumulate(paths.index, { debounce: 500, sort })
const md = () =>
  remark()
    .use(require('remark-slug'))
    .use(require('remark-align'))
    .use(require('remark-html'))

dest(paths.dest)
port(7103)

asset('assets/**/*.*')
asset('assets/CNAME')

asset('2*/*.md')
  .pipe(frontmatter())
  .pipe(rename({ extname: '.html' }))
  .pipe(
    data(file => {
      const m = moment(file.relative, 'YYYY/MM-DD.md')
      const year = m.isoWeekday(4).format('YYYY')
      const week = m.format('w')
      const title = `Week ${week} - ${year}`
      const categories = file.contents
        .toString()
        .match(/^##\s.*$/gm)
        .map(s => s.replace(/^##\s*/, ''))
      const lang = file.frontMatter.lang || 'en'
      return {
        year,
        week,
        date: m.clone(),
        start: m.startOf('isoWeek').format(DATE_FORMAT),
        end: m.endOf('isoWeek').format(DATE_FORMAT),
        basepath: getBasepath(file.relative),
        title,
        categories,
        lang,
        langIcon: langIcon[lang]
      }
    })
  )
  .pipe(
    branch.obj(src => [
      src.pipe(tmpl('tmpl/shuho.md.njk')),
      src
        .pipe(acc())
        .pipe(tmpl('tmpl/index.md.njk'))
        .pipe(data({ basepath: getBasepath(paths.index) }))
    ])
  )
  .pipe(md())
  .pipe(tmpl('tmpl/layout.njk'))
