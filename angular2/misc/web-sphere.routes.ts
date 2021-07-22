

export const WEB_SPHERE_ROUTES: Routes = [{
  path: '', component: WebSphereParentComponent,
  data: {
    redirectPriority: [urls.news.name, urls.macros.name]
  },
  children: [
    {
      path: '',
      component: DummyParentComponent,
      pathMatch: 'full',
      canActivate: [UserRoleParentGuard]
    },
    {
      path: urls.news.name,
      component: NewsListComponent,
      data: {title: urls.news.title},
      canActivate: [UserRoleGuard]
    },
    {
      path: urls.newsEditor.name,
      component: NewsEditorComponent,
      data: {title: urls.newsEditor.title},
      canActivate: [UserRoleGuard]
    },
    {
      path: urls.macros.name,
      component: MacrosListComponent,
      data: {title: urls.macros.title},
      canActivate: [UserRoleGuard]
    },
    {
      path: urls.macrosEditor.name,
      component: MacrosEditorComponent,
      data: {title: urls.macrosEditor.title},
      canDeactivate: [ExitGuard],
      canActivate: [UserRoleGuard]
    },
    {
      path: urls.aperakSettings.name,
      component: AperakSettingListComponent,
      data: {title: urls.aperakSettings.title},
      canActivate: [UserRoleGuard]
    },
    {
      path: urls.creationDocRule.name,
      component: CreationDocRuleListComponent,
      data: {title: urls.creationDocRule.title},
      canActivate: [UserRoleGuard]
    },
    {
      path: urls.webSettings.name,
      component: SettingListComponent,
      data: {title: urls.webSettings.title},
      canActivate: [UserRoleGuard]
    },
    {
      path: urls.assort.name, component: AssortParentComponent,
      data: {
        redirectPriority: [urls.assortMatrix.name, urls.assortDocTypePropName.name]
      },
      children: [
        {
          path: '',
          component: DummyParentComponent,
          pathMatch: 'full',
          canActivate: [UserRoleParentGuard]
        },
        {
          path: urls.assortMatrix.name,
          component: AssortMatrixListComponent,
          data: {title: urls.assortMatrix.title},
          canActivate: [UserRoleGuard]
        },
        {
          path: urls.assortSettingHistory.name + '/:assortSettingId',
          component: AssortSettingHistoryComponent,
          data: {title: urls.assortSettingHistory.title},
        },
        {
          path: urls.assortDocTypePropName.name,
          component: AssortDocTypePropNameListComponent,
          data: {title: urls.assortDocTypePropName.title},
          canActivate: [UserRoleGuard]
        },
      ]
    },
    {
      path: urls.webSphereDict.name, component: DictParentComponent,
      data: {
        redirectPriority: [urls.webSphereDictUnit.name]
      },
      children: [
        {
          path: '',
          component: DummyParentComponent,
          pathMatch: 'full',
          canActivate: [UserRoleParentGuard]
        },
        {
          path: urls.webSphereDictUnit.name,
          component: DictUnitListComponent,
          data: {title: urls.webSphereDictUnit.title},
          canActivate: [UserRoleGuard]
        },
      ]
    },
  ]
}];
