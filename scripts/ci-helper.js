import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * CI辅助工具
 */
class CIHelper {
  constructor() {
    this.workspaceRoot = process.cwd()
    this.changedFiles = this.getChangedFiles()
  }

  /**
   * 获取变更的文件
   */
  getChangedFiles() {
    try {
      const result = execSync('git diff --name-only HEAD~1 HEAD', {
        encoding: 'utf8',
        cwd: this.workspaceRoot,
      })
      return result.trim().split('\n').filter(Boolean)
    } catch (error) {
      console.warn('无法获取git变更，使用空列表:', error.message)
      return []
    }
  }

  /**
   * 检查项目是否有变更
   */
  hasChanges(projectPath) {
    if (this.changedFiles.length === 0) return true // 没有git信息时构建所有项目

    return this.changedFiles.some(
      file =>
        file.startsWith(projectPath) ||
        file.startsWith('packages/shared/') || // shared变更影响所有项目
        file === 'package.json' ||
        file.startsWith('pnpm-') ||
        file.startsWith('.github/'),
    )
  }

  /**
   * 获取需要构建的项目列表
   */
  getProjectsToBuild() {
    const projects = [
      { name: 'shared', path: 'packages/shared/', buildScript: 'build' },
      {
        name: 'vite-plugin-faker',
        path: 'packages/vite-plugin-faker/',
        buildScript: 'build',
      },
      { name: 'faker-ui', path: 'packages/faker-ui/', buildScript: 'build' },
      {
        name: 'api-server',
        path: 'playground/api-server/',
        buildScript: 'build',
      },
      { name: 'vue-app', path: 'playground/vue-app/', buildScript: 'build' },
    ]

    return projects.filter(project => this.hasChanges(project.path))
  }

  /**
   * 检查包是否需要发布
   */
  needsPublish(packagePath) {
    const packageJsonPath = path.join(
      this.workspaceRoot,
      packagePath,
      'package.json',
    )
    if (!existsSync(packageJsonPath)) return false

    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
    if (packageJson.private) return false

    // 检查版本是否已发布到npm
    try {
      execSync(`npm view ${packageJson.name}@${packageJson.version}`, {
        encoding: 'utf8',
        stdio: 'pipe',
      })
      return false // 版本已存在
    } catch {
      return true // 版本不存在，需要发布
    }
  }

  /**
   * 构建单个项目
   */
  buildProject(project) {
    console.log(`🏗️ 构建项目: ${project.name}`)
    try {
      execSync(`pnpm --filter ${project.name} ${project.buildScript}`, {
        stdio: 'inherit',
        cwd: this.workspaceRoot,
      })
      console.log(`✅ ${project.name} 构建成功`)
      return true
    } catch (error) {
      console.error(`❌ ${project.name} 构建失败:`, error.message)
      return false
    }
  }

  /**
   * 运行测试
   */
  runTests(project) {
    console.log(`🧪 测试项目: ${project.name}`)
    try {
      execSync(`pnpm --filter ${project.name} test`, {
        stdio: 'inherit',
        cwd: this.workspaceRoot,
      })
      console.log(`✅ ${project.name} 测试通过`)
      return true
    } catch (error) {
      console.error(`❌ ${project.name} 测试失败:`, error.message)
      return false
    }
  }

  /**
   * 发布包到npm
   */
  publishPackage(packagePath) {
    console.log(`📦 发布包: ${packagePath}`)
    try {
      execSync('pnpm publish --access public --no-git-checks', {
        stdio: 'inherit',
        cwd: path.join(this.workspaceRoot, packagePath),
      })
      console.log(`✅ ${packagePath} 发布成功`)
      return true
    } catch (error) {
      console.error(`❌ ${packagePath} 发布失败:`, error.message)
      return false
    }
  }
}

// CLI命令处理
const command = process.argv[2]
const helper = new CIHelper()

switch (command) {
  case 'check-changes': {
    const projectsToBuild = helper.getProjectsToBuild()
    console.log('需要构建的项目:', projectsToBuild.map(p => p.name).join(', '))
    process.exit(projectsToBuild.length > 0 ? 0 : 1)
    break
  }

  case 'build-changed': {
    const projects = helper.getProjectsToBuild()
    let allSuccess = true

    for (const project of projects) {
      if (!helper.buildProject(project)) {
        allSuccess = false
      }
    }

    process.exit(allSuccess ? 0 : 1)
    break
  }

  case 'test-changed': {
    const testProjects = helper.getProjectsToBuild()
    let allTestsPass = true

    for (const project of testProjects) {
      if (!helper.runTests(project)) {
        allTestsPass = false
      }
    }

    process.exit(allTestsPass ? 0 : 1)
    break
  }

  case 'check-publish': {
    const packagePath = process.argv[3]
    if (!packagePath) {
      console.error('请提供包路径')
      process.exit(1)
    }

    const needsPublish = helper.needsPublish(packagePath)
    console.log(`${packagePath} 需要发布:`, needsPublish)
    process.exit(needsPublish ? 0 : 1)
    break
  }

  default:
    console.log(`
CI辅助工具使用方法:

  node scripts/ci-helper.js check-changes     # 检查哪些项目有变更
  node scripts/ci-helper.js build-changed     # 构建有变更的项目
  node scripts/ci-helper.js test-changed      # 测试有变更的项目
  node scripts/ci-helper.js check-publish <path>  # 检查包是否需要发布
    `)
    process.exit(1)
}
